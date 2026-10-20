# Base de datos local de contactos

Este proyecto es una pequeña aplicación web local para guardar contactos en SQLite, generar datos de prueba y revisar los correos que ya están almacenados. La parte visual está hecha con HTML y JavaScript puro, y el backend funciona con Python.

> Los correos generados son ejemplos ficticios con dominio `@gmail.com`, pero no son cuentas reales ni se valida que existan de verdad.

## Requisitos

- Tener Python 3 instalado.
- Tener un navegador moderno.
- No hace falta instalar paquetes ni dependencias con `pip`.

## Estructura del proyecto

```text
.
├── README.md
├── backend/
│   ├── server.py       # Servidor HTTP, API y acceso a SQLite
│   └── datos.sqlite    # Archivo de la base de datos (se crea al guardar el primer contacto)
└── frontend/
    ├── index.html      # Formulario, botones y tabla de resultados
    └── script.js       # Guardado, generación y verificación desde el navegador
```

El archivo `backend/datos.sqlite` puede que no exista hasta que guardes el primer contacto correctamente.

## Cómo ejecutar la aplicación

1. Abre una terminal dentro de la carpeta del proyecto.
2. Inicia el servidor con este comando:

   ```bash
   python3 backend/server.py
   ```

3. Abre tu navegador en la siguiente dirección: http://127.0.0.1:8000/
4. Para detener el servidor, vuelve a la terminal y pulsa `Ctrl+C`.

El servidor solo escucha en `127.0.0.1` y usa el puerto `8000`. Mantén la terminal abierta mientras usas la aplicación. No abras `frontend/index.html` directamente desde el sistema de archivos, porque la app está diseñada para funcionar a través del servidor.

## Funciones de la página

### Guardar un contacto

Escribe un nombre y un correo electrónico en el formulario y pulsa **Guardar**. El navegador envía la información al backend, que la valida y luego la guarda en SQLite. Si todo sale bien, aparecerá un mensaje indicando que el contacto se guardó correctamente.

Para aceptar el registro, el servidor exige lo siguiente:

- Un nombre con texto que no esté vacío, una vez quitados los espacios al principio y al final.
- Un correo válido con texto antes y después del símbolo `@`, sin espacios, y con un punto en el dominio. Por ejemplo: `persona@gmail.com`.

La primera vez que guardes un contacto, el servidor crea la tabla de forma automática. Los registros ya existentes no se reemplazan.

### Generar 30 contactos

Pulsa **Generar y guardar 30** para crear 30 contactos con nombres aleatorios usando las listas internas del archivo `script.js`. Los correos se forman con el nombre, apellido, una marca de tiempo y un dominio ficticio.

Cada contacto se envía y guarda individualmente. El primer contacto generado aparece en los campos del formulario. El mensaje final indica cuántos registros se guardaron; si falla algo a mitad del proceso, los contactos guardados antes del error ya quedarán almacenados.

Estos datos son solo para pruebas. No se crean cuentas reales ni se consulta ningún servicio de Google.

### Verificar correos guardados

Pulsa **Verificar base de datos** para consultar los contactos que ya están guardados en SQLite. La página mostrará una tabla con nombre, correo y resultado, además de un resumen con el total revisado.

El verificador marca un correo como válido si cumple estas dos condiciones:

1. Tiene más de 3 caracteres, contando después de quitar espacios al principio y al final.
2. Incluye al menos un símbolo `@`.

Este criterio es muy básico y se solicita únicamente para revisar los registros. No comprueba si el dominio es correcto, si pertenece a Gmail ni si el buzón realmente existe. Por eso es menos estricto que una validación completa de correo.

## API local

El frontend y la API se sirven desde el mismo origen: `127.0.0.1:8000`.

### Guardar contacto

`POST /api/contactos`

Cuerpo JSON:

```json
{
  "nombre": "Ada Lovelace",
  "email": "ada@example.com"
}
```

Respuesta correcta: HTTP `201`.

### Verificar contactos

`GET /api/contactos/verificar`

Esta ruta lee `id`, `nombre` y `email` de la tabla `contactos` en el orden de inserción. Abre la base de datos en modo de solo lectura y devuelve los resultados con un campo booleano llamado `valido`.

Ejemplo de respuesta:

```json
{
  "contactos": [
    {
      "id": 1,
      "nombre": "Ada Lovelace",
      "email": "ada@example.com",
      "valido": true
    }
  ]
}
```

## Base de datos

La base de datos está en `backend/datos.sqlite`. La tabla `contactos` se crea al guardar el primer contacto y tiene estas columnas:

| Columna | Tipo | Descripción |
| --- | --- | --- |
| `id` | INTEGER | Identificador autoincremental y clave primaria. |
| `nombre` | TEXT | Nombre del contacto. Es obligatorio. |
| `email` | TEXT | Correo del contacto. Es obligatorio. |
| `creado_en` | TEXT | Fecha y hora de creación generada por SQLite. |

## Solución de problemas

- **No puedo abrir la página:** revisa que el servidor siga activo en la terminal y accede a `http://127.0.0.1:8000/`.
- **El puerto 8000 ya está ocupado:** detén el proceso que lo está usando o cambia el puerto en la línea `ThreadingHTTPServer(("127.0.0.1", 8000), RequestHandler)` dentro de `backend/server.py` y usa ese nuevo puerto.
- **Los registros no se guardan:** comprueba que el nombre no esté vacío y que el correo tenga un formato parecido a `texto@dominio.extension`. Mira también el mensaje que aparece debajo del formulario.
- **El verificador no puede leer la base de datos:** guarda al menos un contacto antes de probar la verificación, porque la base se crea al guardar el primer registro. La consulta no crea ni modifica la base.
- **El botón de generación dice que hubo un guardado parcial:** los contactos anteriores al error ya quedaron guardados. Puedes volver a pulsar el botón para intentar otra tanda.
