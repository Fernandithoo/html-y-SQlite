# Base de datos local de contactos

Aplicación web local para guardar contactos en SQLite, generar datos de prueba y revisar los correos almacenados. El frontend está hecho con HTML y JavaScript sin frameworks; el backend usa Python y la biblioteca estándar.

> Los correos generados tienen formato de ejemplo `@gmail.com`, pero no son cuentas reales ni se comprueba que existan.

## Requisitos

- Python 3 instalado.
- Un navegador web moderno.
- No se necesitan paquetes externos ni instalar dependencias con `pip`.

## Estructura del proyecto

```text
.
├── README.md
├── backend/
│   ├── server.py       # Servidor HTTP, API y acceso a SQLite
│   └── datos.sqlite    # Archivo de base de datos (se crea al guardar el primer contacto)
└── frontend/
    ├── index.html      # Formulario, botones y tabla de resultados
    └── script.js       # Guardado, generación y verificación desde el navegador
```

`backend/datos.sqlite` puede no existir hasta que se guarde el primer contacto correctamente.

## Ejecutar la aplicación

1. Abre una terminal en la carpeta del proyecto.
2. Inicia el servidor:

   ```bash
   python3 backend/server.py
   ```

3. Abre en el navegador <http://127.0.0.1:8000/>.
4. Para detener el servidor, vuelve a la terminal y pulsa `Ctrl+C`.

El servidor escucha solo en `127.0.0.1` y usa el puerto `8000`. Mantén abierta la terminal mientras utilizas la aplicación. No abras `frontend/index.html` directamente como archivo: el navegador necesita comunicarse con el backend para guardar y consultar datos.

## Funciones de la página

### Guardar un contacto

Escribe un nombre y un correo en el formulario y pulsa **Guardar**. El navegador envía los campos al backend, que los valida e inserta en SQLite. Si se guarda correctamente, aparece un mensaje y se limpian los campos.

Para aceptar el guardado, el servidor requiere:

- Un nombre de texto que no esté vacío después de quitar espacios al principio y al final.
- Un correo con texto antes y después de `@`, sin espacios, y con un punto en la parte del dominio. Por ejemplo, `persona@gmail.com`.

El servidor crea la tabla automáticamente en el primer guardado. Los registros existentes no se reemplazan.

### Generar 30 contactos

Pulsa **Generar y guardar 30** para crear 30 contactos con nombres aleatorios a partir de las listas incluidas en `script.js`. Los correos se forman con nombre, apellido, una marca de tiempo, un índice y el dominio `@gmail.com`.

Cada contacto se envía y guarda individualmente. El primer contacto generado queda visible en los campos del formulario. El mensaje indica cuántos registros se guardaron; si ocurre un error a mitad del proceso, muestra el progreso parcial. Si vuelves a pulsar el botón, se genera otra tanda.

Estos son datos ficticios para pruebas. No se crean buzones de Gmail ni se consulta ningún servicio de Google.

### Verificar correos guardados

Pulsa **Verificar base de datos** para consultar los contactos que ya están en SQLite. La página muestra una tabla con nombre, correo y resultado, además de un resumen del total revisado.

El verificador marca un correo como válido si cumple ambas condiciones:

1. Tiene más de 3 caracteres, contando el contenido después de quitar espacios exteriores.
2. Contiene al menos un carácter `@`.

Este es un criterio básico solicitado para revisar los registros. No comprueba que el correo tenga un dominio correcto, que pertenezca a Gmail ni que el buzón exista. Por eso es menos estricto que la validación que se aplica al guardar un contacto nuevo.

## API local

El frontend y la API se sirven desde el mismo origen (`127.0.0.1:8000`).

### Guardar contacto

`POST /api/contactos`

Cuerpo JSON:

```json
{
  "nombre": "Ada Lovelace",
  "email": "ada@example.com"
}
```

Respuesta exitosa: HTTP `201`.

### Verificar contactos

`GET /api/contactos/verificar`

Lee `id`, `nombre` y `email` de la tabla `contactos` en orden de inserción. Abre SQLite en modo de solo lectura y devuelve los registros con un campo booleano `valido`.

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

El archivo está en `backend/datos.sqlite`. La tabla `contactos` se crea al guardar el primer contacto y tiene estas columnas:

| Columna | Tipo | Descripción |
| --- | --- | --- |
| `id` | INTEGER | Identificador autoincremental y clave primaria. |
| `nombre` | TEXT | Nombre del contacto; obligatorio. |
| `email` | TEXT | Correo del contacto; obligatorio. |
| `creado_en` | TEXT | Fecha y hora de creación, generada por SQLite. |

## Solución de problemas

- **No se puede abrir la página:** comprueba que el servidor sigue activo en la terminal y visita `http://127.0.0.1:8000/`.
- **El puerto 8000 ya está ocupado:** detén el proceso que lo utiliza o cambia el puerto en la línea `ThreadingHTTPServer(("127.0.0.1", 8000), RequestHandler)` de `backend/server.py` y usa ese nuevo puerto en el navegador.
- **No se guardan los registros:** revisa que el nombre no esté vacío y que el correo tenga formato `texto@dominio.extensión`. Consulta el mensaje que aparece debajo del formulario.
- **El verificador no puede leer la base:** primero guarda algún contacto para que se cree el archivo y la tabla. La consulta no crea ni modifica la base de datos.
- **El botón de generación informa un guardado parcial:** los contactos anteriores al error ya quedaron guardados; vuelve a pulsar el botón para generar otra tanda.
