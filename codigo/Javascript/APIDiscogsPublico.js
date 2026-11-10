// Cliente público de Discogs y equivalencias de país.
(function (root) {
  "use strict";

  const SEARCH_URL = "https://api.discogs.com/database/search";
  const RELEASES_URL = "https://api.discogs.com/releases";

  // Las etiquetas del catálogo de Discogs no siempre coinciden con el nombre común del JSON.
  // Los candidatos se prueban en orden; para el resto de los 250 países se usa name.common.
  const ALIAS_PAIS_DISCOGS = {
    US: ["US", "USA", "United States"],
    GB: ["UK", "United Kingdom", "United Kingdom of Great Britain and Northern Ireland"],
    AX: ["Åland Islands", "Aland Islands"],
    BA: ["Bosnia-Herzegovina", "Bosnia and Herzegovina"],
    BQ: ["Bonaire, Sint Eustatius, and Saba", "Caribbean Netherlands", "Netherlands Antilles"],
    BN: ["Brunei Darussalam", "Brunei"],
    CD: [
      "Congo, Democratic Republic of the",
      "Congo, The Democratic Republic Of The",
      "Democratic Republic of the Congo",
      "DR Congo",
      "Zaire",
    ],
    CG: ["Congo, Republic of the", "Republic of the Congo", "Congo"],
    CI: ["Ivory Coast", "Cote d'Ivoire", "Côte d'Ivoire"],
    CV: ["Cape Verde", "Cabo Verde"],
    CW: ["Curaçao", "Curacao"],
    CZ: ["Czech Republic", "Czechia"],
    GS: ["South Georgia", "South Georgia & the South Sandwich Islands", "South Georgia and the South Sandwich Islands"],
    MD: ["Moldova", "Moldavia"],
    MK: ["Macedonia", "North Macedonia", "North Macedonia, Republic of"],
    MM: ["Myanmar", "Burma"],
    MO: ["Macau", "Macao"],
    KP: ["North Korea", "Korea, Democratic People's Republic of", "Korea, Democratic People's Republic of (North Korea)"],
    KR: ["South Korea", "Korea, Republic of", "Korea, Republic of (South Korea)"],
    PS: ["Palestine", "Palestinian Territory"],
    RE: ["Réunion", "Reunion"],
    RU: ["Russia", "Russian Federation"],
    RS: ["Serbia", "Serbia, Republic of"],
    SH: ["Saint Helena", "Saint Helena, Ascension and Tristan da Cunha", "Ascension", "Tristan da Cunha"],
    SK: ["Slovakia", "Slovak Republic"],
    SJ: ["Svalbard and Jan Mayen Islands", "Svalbard and Jan Mayen", "Svalbard"],
    ST: ["São Tomé and Príncipe", "Sao Tome and Principe"],
    SZ: ["Eswatini", "Swaziland"],
    TL: ["East Timor", "Timor-Leste"],
    TR: ["Turkey", "Türkiye"],
    UM: ["USA Minor Outlying Islands", "United States Minor Outlying Islands"],
    VA: ["Vatican City", "Vatican City State"],
    XK: ["Kosovo", "Kosovo, Republic of"],
    LK: ["Sri Lanka", "Ceylon"],
  };

  async function solicitarJson(url, options = {}) {
    const { signal, fetchImpl = root.fetch } = options;
    if (typeof fetchImpl !== "function") {
      throw new Error("Este entorno no tiene fetch disponible.");
    }

    const response = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/vnd.discogs.v2+json" },
      signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      const error = new Error(
        `Discogs respondió con HTTP ${response.status}${detail ? `: ${detail}` : ""}`
      );
      error.status = response.status;
      error.rateLimit = response.headers?.get("X-Discogs-Ratelimit");
      error.rateLimitRemaining = response.headers?.get("X-Discogs-Ratelimit-Remaining");
      throw error;
    }

    return response.json();
  }

  /**
   * Busca lanzamientos públicos de Discogs por país y género sin credenciales.
   *
   * @param {object} options
   * @param {string} options.pais Nombre común del país; se usa como último candidato.
   * @param {string} [options.codigoPais] Código cca2 del país elegido en DB_Paises/countries.json.
   * @param {string} options.genero Género tal como lo espera Discogs.
   * @param {number} [options.pagina=1] Página de resultados.
   * @param {number} [options.porPagina=50] Resultados por página (máximo 100).
   * @param {AbortSignal} [options.signal] Señal opcional para cancelar la petición.
   * @returns {Promise<object>} Respuesta de búsqueda de Discogs con paginación y resultados.
   */
  async function buscarPorPaisYGenero(options) {
    const {
      pais,
      codigoPais,
      genero,
      pagina = 1,
      porPagina = 50,
      signal,
      fetchImpl = root.fetch,
    } = options || {};

    if (typeof pais !== "string" || pais.trim() === "") {
      throw new TypeError('"pais" es obligatorio y debe ser un texto.');
    }
    if (typeof genero !== "string" || genero.trim() === "") {
      throw new TypeError('"genero" es obligatorio y debe ser un texto.');
    }
    if (!Number.isInteger(pagina) || pagina < 1) {
      throw new RangeError('"pagina" debe ser un entero mayor o igual a 1.');
    }
    if (!Number.isInteger(porPagina) || porPagina < 1 || porPagina > 100) {
      throw new RangeError('"porPagina" debe ser un entero entre 1 y 100.');
    }
    const url = new URL(SEARCH_URL);
    url.searchParams.set("genre", genero.trim());
    url.searchParams.set("type", "release");
    url.searchParams.set("page", String(pagina));
    url.searchParams.set("per_page", String(porPagina));

    const candidatos = obtenerCandidatosPais(pais, codigoPais);
    let ultimaRespuesta;

    for (const [indice, candidato] of candidatos.entries()) {
      url.searchParams.set("country", candidato);
      ultimaRespuesta = await solicitarJson(url.toString(), { signal, fetchImpl });
      if (ultimaRespuesta.results?.length || indice === candidatos.length - 1) {
        return ultimaRespuesta;
      }
    }

    return ultimaRespuesta;
  }

  function obtenerCandidatosPais(pais, codigoPais) {
    let codigo = typeof codigoPais === "string" ? codigoPais.trim().toUpperCase() : "";
    if (!codigo) {
      const nombreNormalizado = normalizarPais(pais);
      codigo = Object.entries(ALIAS_PAIS_DISCOGS).find(([, variantes]) =>
        variantes.some(variante => normalizarPais(variante) === nombreNormalizado)
      )?.[0] || "";
    }

    const alias = ALIAS_PAIS_DISCOGS[codigo] || [];
    return [...new Set([...alias, pais.trim()])];
  }

  function normalizarPais(nombre) {
    return nombre
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  async function obtenerLanzamiento(id, options = {}) {
    const releaseId = Number(id);
    if (!Number.isSafeInteger(releaseId) || releaseId < 1) {
      throw new TypeError('"id" debe ser un identificador de lanzamiento válido.');
    }

    const { signal, fetchImpl = root.fetch } = options;
    return solicitarJson(`${RELEASES_URL}/${releaseId}`, { signal, fetchImpl });
  }

  const api = { buscarPorPaisYGenero, obtenerLanzamiento };
  root.APIDiscogsPublico = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);

