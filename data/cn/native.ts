export const echoProgram = `#!/usr/bin/env python3
"""Authorized loopback-only, one-client teaching server. Python 3 standard library."""
import argparse
import io
import socket
import struct
import sys
import threading

MAX_MESSAGE = 65536
TIMEOUT = 5.0

def read_exact(reader, count, clean_eof=False):
    data = bytearray()
    while len(data) < count:
        chunk = reader(count - len(data))
        if not chunk:
            if clean_eof and not data:
                return None
            raise EOFError("truncated frame")
        data.extend(chunk)
    return bytes(data)

def encode_frame(body):
    if len(body) > MAX_MESSAGE:
        raise ValueError("message exceeds 65536-byte limit")
    return struct.pack("!I", len(body)) + body

def read_frame(reader):
    header = read_exact(reader, 4, clean_eof=True)
    if header is None:
        return None
    size = struct.unpack("!I", header)[0]
    if size > MAX_MESSAGE:
        raise ValueError("declared length exceeds 65536-byte limit")
    return read_exact(reader, size)

def echo_connection(conn, framed):
    conn.settimeout(TIMEOUT)
    if framed:
        while True:
            body = read_frame(conn.recv)
            if body is None:
                return
            conn.sendall(encode_frame(body))
    else:
        while True:
            data = conn.recv(4096)
            if not data:
                return
            conn.sendall(data)

def server(port, framed):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
        listener.settimeout(TIMEOUT)
        listener.bind(("127.0.0.1", port))
        listener.listen(1)
        print("Ready on 127.0.0.1:%d" % listener.getsockname()[1], flush=True)
        conn, _ = listener.accept()
        with conn:
            echo_connection(conn, framed)

def client(port, framed, message):
    body = message.encode("utf-8")
    with socket.create_connection(("127.0.0.1", port), TIMEOUT) as conn:
        conn.settimeout(TIMEOUT)
        conn.sendall(encode_frame(body) if framed else body)
        conn.shutdown(socket.SHUT_WR)
        if framed:
            result = read_frame(conn.recv)
            if result is None:
                raise EOFError("missing response")
            if conn.recv(1):
                raise ValueError("unexpected trailing response data")
        else:
            chunks = []
            while True:
                chunk = conn.recv(4096)
                if not chunk:
                    break
                chunks.append(chunk)
            result = b"".join(chunks)
        if result != body:
            raise ValueError("echo mismatch")
        print("Echo:", result.decode("utf-8"))

class ChunkReader:
    def __init__(self, chunks):
        self.chunks = [bytes(c) for c in chunks if c]
    def read(self, count):
        if not self.chunks:
            return b""
        chunk = self.chunks[0][:count]
        self.chunks[0] = self.chunks[0][count:]
        if not self.chunks[0]:
            self.chunks.pop(0)
        return chunk

def self_test():
    messages = [b"hello", b"", b"network"]
    wire = b"".join(encode_frame(message) for message in messages)
    cases = [[wire[:i], wire[i:]] for i in range(len(wire) + 1)]
    cases += [[wire], [bytes([b]) for b in wire]]
    for chunks in cases:
        reader = ChunkReader(chunks).read
        assert [read_frame(reader) for _ in messages] == messages
        assert read_frame(reader) is None
    utf8_body = "caf\\u00e9".encode("utf-8")
    assert len(utf8_body) == 5
    assert encode_frame(utf8_body)[:4] == struct.pack("!I", 5)
    assert read_frame(io.BytesIO(encode_frame(utf8_body)).read) == utf8_body
    boundary = b"x" * MAX_MESSAGE
    assert read_frame(io.BytesIO(encode_frame(boundary)).read) == boundary
    try:
        encode_frame(boundary + b"x")
    except ValueError:
        pass
    else:
        raise AssertionError("oversized outgoing frame accepted")
    for wire_bad in [b"\\x00\\x00", struct.pack("!I", 3) + b"x",
                     struct.pack("!I", MAX_MESSAGE + 1)]:
        try:
            read_frame(io.BytesIO(wire_bad).read)
        except (EOFError, ValueError):
            pass
        else:
            raise AssertionError("invalid frame accepted")
    for framed in [False, True]:
        errors = []
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
            listener.settimeout(TIMEOUT)
            listener.bind(("127.0.0.1", 0))
            listener.listen(1)
            port = listener.getsockname()[1]
            def worker():
                try:
                    conn, _ = listener.accept()
                    with conn:
                        echo_connection(conn, framed)
                except (OSError, EOFError, ValueError) as error:
                    errors.append(error)
            thread = threading.Thread(target=worker, daemon=True)
            thread.start()
            with socket.create_connection(("127.0.0.1", port), TIMEOUT) as conn:
                conn.settimeout(TIMEOUT)
                request = wire if framed else b"hello network"
                for start in range(0, len(request), 3):
                    conn.sendall(request[start:start + 3])
                conn.shutdown(socket.SHUT_WR)
                if framed:
                    assert [read_frame(conn.recv) for _ in messages] == messages
                    assert read_frame(conn.recv) is None
                else:
                    response = bytearray()
                    while True:
                        chunk = conn.recv(4096)
                        if not chunk:
                            break
                        response.extend(chunk)
                    assert bytes(response) == request
            thread.join(TIMEOUT + 1)
            if thread.is_alive():
                raise RuntimeError("server did not finish")
            if errors:
                raise errors[0]
    print("PASS: 27 chunk cases, UTF-8 byte length, exact maximum, 4 rejection cases, TCP plain/framed half-close")

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--server", action="store_true")
    mode.add_argument("--client", action="store_true")
    mode.add_argument("--self-test", action="store_true")
    parser.add_argument("--port", type=int, default=4040)
    parser.add_argument("--framed", action="store_true")
    parser.add_argument("--message", default="hello network")
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("port must be between 1 and 65535")
    try:
        if args.self_test:
            self_test()
        elif args.server:
            server(args.port, args.framed)
        else:
            client(args.port, args.framed, args.message)
    except (OSError, EOFError, ValueError, RuntimeError, AssertionError) as error:
        print("ERROR:", error, file=sys.stderr)
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())
`;
