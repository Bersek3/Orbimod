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

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_POST(self):
        if self.path.startswith('/api/kick-token'):
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                import json
                import urllib.request
                import urllib.parse

                req_data = json.loads(post_data.decode('utf-8'))
                code = req_data.get('code')
                client_id = req_data.get('client_id', '01M0VT0JC58YQEVGRHM8JFXQX3')
                client_secret = req_data.get('client_secret', 'ee10e46fccf83a105e86834973db23cabcad279f33acf48bd4f6b5749884bb20')
                redirect_uri = req_data.get('redirect_uri', f'http://localhost:{PORT}/')

                token_url = 'https://id.kick.com/oauth/token'
                payload = urllib.parse.urlencode({
                    'grant_type': 'authorization_code',
                    'client_id': client_id,
                    'client_secret': client_secret,
                    'code': code,
                    'redirect_uri': redirect_uri
                }).encode('utf-8')

                req = urllib.request.Request(token_url, data=payload, headers={
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                })

                with urllib.request.urlopen(req, timeout=10) as response:
                    res_data = response.read()
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(res_data)
            except Exception as e:
                import json
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
            return
        
        self.send_error(404, "Endpoint Not Found")

def main():
    os.chdir(DIRECTORY)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), RobustHandler) as httpd:
        print(f"[*] ORBIMOD - HTTP Server active on http://localhost:{PORT}")
        sys.stdout.flush()
        httpd.serve_forever()

if __name__ == "__main__":
    main()
