const formularioContacto = document.querySelector("#contactForm");

if (formularioContacto) {
    formularioContacto.addEventListener("submit", (event) => {
        // El formulario es una demostración local y no tiene un servidor de destino.
        event.preventDefault();

        const nombre = formularioContacto.elements.namedItem("nombre");
        const email = formularioContacto.elements.namedItem("email");
        const tema = formularioContacto.elements.namedItem("tema");
        const mensaje = formularioContacto.elements.namedItem("mensaje");
        const consentimiento = formularioContacto.elements.namedItem("consentimiento");
        const preferencia = formularioContacto.querySelector('input[name="preferencia"]:checked');

        const errores = [];
        const primerCampoInvalido = [];

        if (nombre.value.trim().length < 2) {
            errores.push("Ingresá tu nombre y apellido (al menos 2 caracteres).");
            primerCampoInvalido.push(nombre);
        }

        const emailLimpio = email.value.trim();
        if (!emailLimpio || email.validity.typeMismatch) {
            errores.push("Ingresá una dirección de correo electrónico válida.");
            primerCampoInvalido.push(email);
        }

        if (!tema.value) {
            errores.push("Elegí el motivo de tu mensaje.");
            primerCampoInvalido.push(tema);
        }

        if (!preferencia) {
            errores.push("Elegí cómo preferís recibir una respuesta.");
            primerCampoInvalido.push(formularioContacto.querySelector('input[name="preferencia"]'));
        }

        if (mensaje.value.trim().length < 10) {
            errores.push("El mensaje debe tener al menos 10 caracteres.");
            primerCampoInvalido.push(mensaje);
        }

        if (!consentimiento.checked) {
            errores.push("Aceptá el uso de tus datos para responder el mensaje.");
            primerCampoInvalido.push(consentimiento);
        }

        if (errores.length > 0) {
            window.alert("Revisá el formulario:\n\n• " + errores.join("\n• "));
            primerCampoInvalido[0]?.focus();
            return;
        }

        window.alert("¡Gracias! El formulario se validó correctamente. Esta demostración no envía el mensaje a un servidor.");
        formularioContacto.reset();
    });
}

