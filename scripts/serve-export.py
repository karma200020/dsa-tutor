#!/usr/bin/env python3
"""Loopback-only static export preview; does not modify network configuration."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", default="out")
    parser.add_argument("--port", type=int, default=4179)
    parser.add_argument("--base-path", default="/dsa-tutor")
    args = parser.parse_args()
    directory = Path(args.directory).resolve()
    if not directory.is_dir():
        parser.error("export directory does not exist; build the application first")
    if not 1 <= args.port <= 65535:
        parser.error("port must be between 1 and 65535")
    prefix = args.base_path.rstrip("/")
    if prefix and not prefix.startswith("/"):
        parser.error("base path must start with /")

    class Handler(SimpleHTTPRequestHandler):
        def do_GET(self):
            path = urlsplit(self.path).path
            if prefix and path == prefix:
                self.send_response(301)
                self.send_header("Location", prefix + "/")
                self.end_headers()
                return
            if prefix and not path.startswith(prefix + "/"):
                self.send_error(404)
                return
            self.path = self.path[len(prefix):]
            super().do_GET()

    with ThreadingHTTPServer(("127.0.0.1", args.port),
                             partial(Handler, directory=str(directory))) as server:
        print("Preview: http://127.0.0.1:%d%s/" % (args.port, prefix), flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("Preview stopped.")


if __name__ == "__main__":
    main()
