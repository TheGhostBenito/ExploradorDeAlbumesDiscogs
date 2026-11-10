// Datos de países usados en el autocompletado.
let paises = [];

fetch("DB_Paises/countries.json")
  .then(res => res.json())
  .then(data => {
    paises = data;
    console.log("Países cargados:", paises);
  })
  .catch(err => console.error("Error cargando países:", err));


const inputPais = document.getElementById("pais");
const sugerencias = document.getElementById("sugerencias");
const resultados = document.getElementById("resultados");
const estadoBusqueda = document.getElementById("estadoBusqueda");
const botonesBusqueda = [document.getElementById("buscar"), document.getElementById("aleatorio")];

inputPais.addEventListener("input", () => {
  inputPais.dataset.code = "";
  const valor = inputPais.value.toLowerCase();
  sugerencias.innerHTML = "";

  if (valor.length === 0) return;

  const filtrados = paises.filter(p => p.name.common.toLowerCase().includes(valor));

  filtrados.forEach(p => {
    const li = document.createElement("li");
    li.textContent = p.name.common;
    li.addEventListener("click", () => {
      inputPais.value = p.name.common;
      inputPais.dataset.code = p.cca2;
      sugerencias.innerHTML = "";
    });
    sugerencias.appendChild(li);
  });
});



// Busca lanzamientos públicos de Discogs sin key ni secret.
async function buscarAlbums(genero, pais, { codigoPais = "", aleatorio = false } = {}) {
  if (!pais) {
    mostrarError("Seleccioná un país antes de buscar.");
    return;
  }

  mostrarCarga();

  try {
    const data = await APIDiscogsPublico.buscarPorPaisYGenero({
      genero,
      pais,
      codigoPais,
      porPagina: 100,
    });

    if (!Array.isArray(data.results) || data.results.length === 0) {
      resultados.replaceChildren(estadoBusqueda);
      actualizarEstado("No encontramos lanzamientos con esos filtros. Probá otro país o género.", "error");
      return;
    }

    const albums = seleccionarAleatorios(data.results, aleatorio ? 1 : 6);
    resultados.replaceChildren(estadoBusqueda);
    actualizarEstado(
      aleatorio
        ? "Lanzamiento aleatorio encontrado."
        : `Mostrando ${albums.length} lanzamientos aleatorios.`,
      "success"
    );

    albums.forEach(album => {
      const card = document.createElement("article");
      card.className = "album-card";

      let imageUrls = obtenerUrlsDeImagen(album);
      if (imageUrls.length > 0) {
        agregarPortada(card, album, imageUrls, () => cargarPortadaDesdeDetalle(card, album));
      }

      const title = document.createElement("h3");
      title.textContent = album.title || "Título desconocido";
      card.appendChild(title);

      const details = document.createElement("p");
      details.textContent = `${album.country || "País desconocido"} - ${album.year || "Año desconocido"}`;
      card.appendChild(details);

      const source = document.createElement("a");
      source.href = obtenerUrlDiscogs(album);
      source.target = "_blank";
      source.rel = "noopener noreferrer";
      source.textContent = "Data provided by Discogs.";
      card.appendChild(source);

      resultados.appendChild(card);

      // La búsqueda no siempre incluye los datos de imagen; consulta el detalle solo si hace falta.
      if (imageUrls.length === 0) {
        cargarPortadaDesdeDetalle(card, album);
      }
    });
  } catch (err) {
    console.error("Error en la petición pública a Discogs:", err);
    const mensaje = err.status === 429
      ? "Discogs limitó temporalmente las búsquedas. Esperá un momento e intentá de nuevo."
      : "No pudimos cargar los lanzamientos. Revisá tu conexión e intentá de nuevo.";
    mostrarError(mensaje, () => buscarAlbums(genero, pais, { codigoPais, aleatorio }));
  } finally {
    establecerCarga(false);
  }
}

function actualizarEstado(mensaje, tipo = "info") {
  estadoBusqueda.textContent = mensaje;
  estadoBusqueda.className = `estado-busqueda ${tipo}`;
}

function establecerCarga(estaCargando) {
  resultados.setAttribute("aria-busy", String(estaCargando));
  botonesBusqueda.forEach(boton => { boton.disabled = estaCargando; });
}

function mostrarCarga() {
  resultados.replaceChildren(estadoBusqueda);
  actualizarEstado("Buscando lanzamientos en Discogs…", "loading");
  establecerCarga(true);

  const indicador = document.createElement("span");
  indicador.className = "estado-carga";
  indicador.setAttribute("aria-hidden", "true");
  resultados.appendChild(indicador);

  for (let indice = 0; indice < 6; indice += 1) {
    const esqueleto = document.createElement("article");
    esqueleto.className = "album-card skeleton-card";
    esqueleto.setAttribute("aria-hidden", "true");
    const portada = document.createElement("div");
    portada.className = "skeleton-cover";
    const titulo = document.createElement("div");
    titulo.className = "skeleton-line";
    esqueleto.append(portada, titulo);
    resultados.appendChild(esqueleto);
  }
}

function mostrarError(mensaje, alReintentar = null) {
  resultados.replaceChildren(estadoBusqueda);
  actualizarEstado(mensaje, "error");

  if (alReintentar) {
    const reintentar = document.createElement("button");
    reintentar.type = "button";
    reintentar.className = "boton-reintentar";
    reintentar.textContent = "Reintentar búsqueda";
    reintentar.addEventListener("click", alReintentar, { once: true });
    resultados.appendChild(reintentar);
  }
}

function seleccionarAleatorios(elementos, cantidad) {
  const mezcla = [...elementos];
  for (let indice = mezcla.length - 1; indice > 0; indice -= 1) {
    const otroIndice = Math.floor(Math.random() * (indice + 1));
    [mezcla[indice], mezcla[otroIndice]] = [mezcla[otroIndice], mezcla[indice]];
  }
  return mezcla.slice(0, cantidad);
}

function obtenerUrlDiscogs(album) {
  const ruta = album.uri || `/release/${album.id}`;
  try {
    const url = new URL(ruta, "https://www.discogs.com");
    if (url.hostname === "www.discogs.com" || url.hostname === "discogs.com") {
      return url.href;
    }
  } catch (error) {
    console.warn("No se pudo interpretar la URL del lanzamiento:", error);
  }
  return `https://www.discogs.com/release/${album.id}`;
}

function obtenerUrlsDeImagen(recurso) {
  const imagenes = Array.isArray(recurso.images) ? [...recurso.images] : [];
  imagenes.sort((a, b) => Number(b.type === "primary") - Number(a.type === "primary"));

  return [
    recurso.cover_image,
    recurso.thumb,
    ...imagenes.flatMap(imagen => [imagen.uri, imagen.resource_url, imagen.uri150]),
  ].filter((url, index, todas) =>
    typeof url === "string" && url.trim() !== "" && todas.indexOf(url) === index
  );
}

function cargarPortadaDesdeDetalle(card, album) {
  if (!album.id) return;

  APIDiscogsPublico.obtenerLanzamiento(album.id)
    .then(detalle => {
      const imageUrls = obtenerUrlsDeImagen(detalle);
      if (imageUrls.length > 0) agregarPortada(card, album, imageUrls);
    })
    .catch(err => {
      console.warn(`No se pudo cargar la portada del lanzamiento ${album.id}:`, err);
    });
}

function agregarPortada(card, album, imageUrls, onAllImagesFailed = null) {
  const image = document.createElement("img");
  image.alt = album.title || "Portada del lanzamiento";
  let imageIndex = 0;
  image.src = imageUrls[imageIndex];
  image.addEventListener("error", () => {
    imageIndex += 1;
    if (imageIndex < imageUrls.length) {
      image.src = imageUrls[imageIndex];
    } else {
      image.remove();
      if (onAllImagesFailed) onAllImagesFailed();
    }
  });
  card.insertBefore(image, card.firstChild);
}

// Eventos de los botones
document.getElementById("buscar").addEventListener("click", () => {
  const genero = document.getElementById("genero").value;
  const pais = document.getElementById("pais").value.trim();
  const codigoPais = obtenerCodigoPais(pais);
  buscarAlbums(genero, pais, { codigoPais });
});

document.getElementById("aleatorio").addEventListener("click", () => {
  const genero = document.getElementById("genero").value;
  const pais = document.getElementById("pais").value.trim();
  const codigoPais = obtenerCodigoPais(pais);
  buscarAlbums(genero, pais, { codigoPais, aleatorio: true });
});

function obtenerCodigoPais(nombre) {
  const nombreNormalizado = nombre.trim().toLocaleLowerCase();
  return inputPais.dataset.code ||
    paises.find(pais => pais.name.common.toLocaleLowerCase() === nombreNormalizado)?.cca2 ||
    "";
}

