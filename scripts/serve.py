#!/usr/bin/env python3
"""Static dev server that ALWAYS sends fresh files.

The game is split into many ES modules that import each other. A normal static
server lets the browser cache them, so after edits you can end up running a mix
of old + new modules — which shows up as "won't let me in", crashes on certain
actions, or "the player isn't spawning". This server sends no-cache headers on
every response so the browser always reloads the latest code. No hard-refresh
needed.

    python3 scripts/serve.py          # http://localhost:8123
    PORT=9000 python3 scripts/serve.py
"""
import http.server, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(os.environ.get("PORT", "8123"))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def guess_type(self, path):
        # make sure ES modules are served with a JS mime type
        if path.endswith(".js") or path.endswith(".mjs"):
            return "application/javascript"
        return super().guess_type(path)


if __name__ == "__main__":
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), NoCacheHandler) as httpd:
        print(f"Deepcrag dev server (no-cache) at http://localhost:{PORT}")
        print("Serving", ROOT)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nstopped")
            sys.exit(0)
