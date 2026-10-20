import json
import re
import sqlite3
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


# Calcula las rutas desde este archivo para que el servidor funcione
# aunque se inicie desde otra carpeta.
PROJECT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = PROJECT_DIR / "frontend"
DATABASE_PATH = Path(__file__).resolve().parent / "datos.sqlite"


class RequestHandler(SimpleHTTPRequestHandler):
    # Sirve los archivos estaticos desde frontend/ y procesa tambien la API.
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(FRONTEND_DIR), **kwargs)

    def send_json(self, status, payload):
        # Usa el mismo formato JSON para respuestas exitosas y errores.
        response = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def do_GET(self):
        # La ruta de verificación es una API; las demás rutas siguen sirviendo archivos estáticos.
        if urlparse(self.path).path != "/api/contactos/verificar":
            super().do_GET()
            return

        try:
            # Abre el archivo en modo de solo lectura para no modificar datos al verificar.
            database_uri = f"{DATABASE_PATH.as_uri()}?mode=ro"
            with sqlite3.connect(database_uri, uri=True) as database:
                # Recupera únicamente los campos que se muestran en el resultado.
                rows = database.execute(
                    "SELECT id, nombre, email FROM contactos ORDER BY id"
                ).fetchall()
        except sqlite3.Error:
            self.send_json(500, {"error": "No se pudieron leer los contactos de la base de datos."})
            return

        # Aplica literalmente los criterios solicitados: más de 3 caracteres y al menos un @.
        contactos = [
            {
                "id": contacto_id,
                "nombre": nombre,
                "email": email,
                "valido": isinstance(email, str) and len(email.strip()) > 3 and "@" in email,
            }
            for contacto_id, nombre, email in rows
        ]
        # Devuelve los registros y su clasificación al navegador como JSON.
        self.send_json(200, {"contactos": contactos})

    def do_POST(self):
        # Acepta envios solamente en esta ruta de la API.
        if urlparse(self.path).path != "/api/contactos":
            self.send_json(404, {"error": "Ruta no encontrada."})
            return

        try:
            # Limita el tamano del cuerpo antes de leerlo y convertirlo desde JSON.
            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length <= 0 or content_length > 16_384:
                raise ValueError
            payload = json.loads(self.rfile.read(content_length))
        except (ValueError, json.JSONDecodeError):
            self.send_json(400, {"error": "La solicitud no es válida."})
            return

        if not isinstance(payload, dict):
            self.send_json(400, {"error": "La solicitud no es válida."})
            return

        # Comprueba tipos y contenido antes de intentar guardar en la base.
        nombre = payload.get("nombre")
        email = payload.get("email")
        if (
            not isinstance(nombre, str)
            or not nombre.strip()
            or not isinstance(email, str)
            or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email.strip())
        ):
            self.send_json(422, {"error": "Escribe un nombre y un email válido."})
            return

        try:
            with sqlite3.connect(DATABASE_PATH) as database:
                # Crea la tabla en el primer envio; no reemplaza registros existentes.
                database.execute(
                    """CREATE TABLE IF NOT EXISTS contactos (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        nombre TEXT NOT NULL,
                        email TEXT NOT NULL,
                        creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )"""
                )
                # Los signos ? hacen que SQLite trate los datos como valores,
                # no como parte de la instruccion SQL.
                database.execute(
                    "INSERT INTO contactos (nombre, email) VALUES (?, ?)",
                    (nombre.strip(), email.strip()),
                )
        except sqlite3.Error:
            self.send_json(500, {"error": "No se pudo guardar el registro."})
            return

        # 201 indica que se creo un registro correctamente.
        self.send_json(201, {"message": "Registro guardado correctamente."})


if __name__ == "__main__":
    # 127.0.0.1 limita el acceso a esta computadora; el servidor es local.
    server = ThreadingHTTPServer(("127.0.0.1", 8000), RequestHandler)
    print("Servidor listo en http://127.0.0.1:8000 (Ctrl+C para detener)")
    try:
        # Atiende solicitudes hasta que se presione Ctrl+C.
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
    finally:
        # Cierra ordenadamente el socket del servidor al detenerlo.
        server.server_close()