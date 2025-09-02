#!/usr/bin/env python3
import http.server
import socketserver
import os

PORT = 8080

os.chdir('frontend/dist')

Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Server running at http://localhost:{PORT}/")
    httpd.serve_forever()