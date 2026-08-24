import http.server
import socketserver
import os
import sys
import mimetypes

PORT = 5500
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

MIME_MAP = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon'
}

class RobustHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        url_path = self.path.split('?')[0].split('#')[0]
        if url_path == '/' or url_path == '':
            url_path = '/index.html'

        rel_path = url_path.lstrip('/').replace('/', os.sep)
        full_path = os.path.abspath(os.path.join(DIRECTORY, rel_path))

        # Security check: ensure path is within DIRECTORY
        if not full_path.startswith(DIRECTORY):
            self.send_error(403, "Access Denied")
            return

        if os.path.isdir(full_path):
            full_path = os.path.join(full_path, 'index.html')

        if not os.path.exists(full_path) or not os.path.isfile(full_path):
            self.send_error(404, f"File Not Found: {url_path}")
            return

        ext = os.path.splitext(full_path)[1].lower()
        content_type = MIME_MAP.get(ext, 'application/octet-stream')

        try:
            with open(full_path, 'rb') as f:
                content = f.read()

            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(content)))
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error(500, f"Internal Error: {str(e)}")

def main():
    os.chdir(DIRECTORY)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), RobustHandler) as httpd:
        print(f"[*] NEXUS MOD DECK - HTTP Server active on http://localhost:{PORT}")
        sys.stdout.flush()
        httpd.serve_forever()

if __name__ == "__main__":
    main()
