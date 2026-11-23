#!/usr/bin/env bash


# Incredibly hacky 
# but it works 
# so i keep it :3
SOCK="/tmp/eden-em.sock"

python3 - "$SOCK" <<'PY'
import socket
import sys

sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)

try:
    sock.connect(sys.argv[1])
    sock.sendall(b"toggle")
except ConnectionRefusedError:
    print("Eden is not running.")
except FileNotFoundError:
    print("Eden socket not found.")
finally:
    sock.close()
PY