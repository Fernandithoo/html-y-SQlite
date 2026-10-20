// Busca los elementos del HTML que el script necesita controlar.
const form = document.querySelector('#registro-form');
const statusMessage = document.querySelector('#estado');
const generateButton = document.querySelector('#generar-contactos');
// Referencias a los controles que muestran el resultado de revisar la base de datos.
const verifyButton = document.querySelector('#verificar-contactos');
const verificationStatus = document.querySelector('#verificacion-estado');
const verificationTable = document.querySelector('#tabla-verificacion');
const verificationResults = document.querySelector('#resultados-verificacion');

// Listas usadas para crear nombres aleatorios para los contactos de prueba.
const nombres = ['Sofia', 'Mateo', 'Valentina', 'Santiago', 'Camila', 'Daniel', 'Lucia', 'Sebastian', 'Mariana', 'Nicolas', 'Gabriela', 'Diego', 'Isabella', 'Samuel', 'Daniela'];
const apellidos = ['Garcia', 'Rodriguez', 'Martinez', 'Lopez', 'Gonzalez', 'Perez', 'Sanchez', 'Ramirez', 'Torres', 'Flores', 'Rivera', 'Gomez', 'Diaz', 'Cruz', 'Morales'];

// Envía un contacto a la API y convierte las respuestas de error en excepciones.
async function guardarContacto(contacto) {
	const response = await fetch('/api/contactos', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(contacto),
	});
	const result = await response.json();

	if (!response.ok) {
		throw new Error(result.error || 'No se pudo guardar el registro.');
	}
}

form.addEventListener('submit', async (event) => {
	// Evita que el navegador recargue la pagina al enviar el formulario.
	event.preventDefault();
	statusMessage.textContent = 'Guardando...';

	try {
		await guardarContacto(Object.fromEntries(new FormData(form)));

		// Confirma el guardado y limpia los campos para el siguiente contacto.
		statusMessage.textContent = 'Registro guardado correctamente.';
		form.reset();
	} catch (error) {
		// Informa si el servidor no respondio o rechazo los datos.
		statusMessage.textContent = error.message;
	}
});

generateButton.addEventListener('click', async () => {
	// La marca de tiempo y el índice distinguen los 30 correos generados en esta tanda.
	const timestamp = Date.now().toString(36);
	const contactos = Array.from({ length: 30 }, (_, index) => {
		const nombre = nombres[Math.floor(Math.random() * nombres.length)];
		const apellido = apellidos[Math.floor(Math.random() * apellidos.length)];

		return {
			nombre: `${nombre} ${apellido}`,
			email: `${nombre.toLowerCase()}.${apellido.toLowerCase()}.${timestamp}${index}@gmail.com`,
		};
	});

	// Deja visible en los campos el primer contacto de la tanda generada.
	form.elements.nombre.value = contactos[0].nombre;
	form.elements.email.value = contactos[0].email;
	// Evita iniciar otra tanda mientras esta se está guardando.
	generateButton.disabled = true;
	statusMessage.textContent = 'Generando y guardando contactos...';

	let guardados = 0;
	try {
		// Guarda en secuencia para saber cuántos se completaron si ocurre un error.
		for (const contacto of contactos) {
			await guardarContacto(contacto);
			guardados += 1;
		}
		statusMessage.textContent = `Se guardaron ${guardados} contactos.`;
	} catch (error) {
		// Informa el progreso parcial si la API rechaza algún contacto o no responde.
		statusMessage.textContent = `Se guardaron ${guardados} de 30 contactos. ${error.message}`;
	} finally {
		// Vuelve a habilitar el botón tanto si todo salió bien como si hubo un error.
		generateButton.disabled = false;
	}
});

verifyButton.addEventListener('click', async () => {
	// Limpia la verificación anterior y muestra que se está consultando SQLite.
	verifyButton.disabled = true;
	verificationStatus.textContent = 'Leyendo contactos guardados...';
	verificationTable.hidden = true;
	verificationResults.replaceChildren();

	try {
		// Pide al servidor la lista de contactos guardados y su resultado de validación.
		const response = await fetch('/api/contactos/verificar');
		const result = await response.json();

		if (!response.ok) {
			throw new Error(result.error || 'No se pudieron verificar los contactos.');
		}

		let validos = 0;
		// Construye una fila por contacto usando texto, sin interpretar valores como HTML.
		for (const contacto of result.contactos) {
			const row = document.createElement('tr');
			for (const value of [contacto.nombre, contacto.email, contacto.valido ? 'Válido' : 'Inválido']) {
				const cell = document.createElement('td');
				cell.textContent = value;
				row.append(cell);
			}
			verificationResults.append(row);
			if (contacto.valido) validos += 1;
		}

		// Muestra la tabla y resume cuántos correos cumplen el criterio solicitado.
		verificationTable.hidden = false;
		verificationStatus.textContent = `Revisados: ${result.contactos.length}. Válidos: ${validos}. Inválidos: ${result.contactos.length - validos}.`;
	} catch (error) {
		verificationStatus.textContent = error.message;
	} finally {
		// Permite volver a ejecutar la verificación.
		verifyButton.disabled = false;
	}
});
