#!/usr/bin/env python3

import ctypes
import gi
import socket 
import os

ctypes.CDLL("libgtk4-layer-shell.so")

gi.require_version("Gtk", "4.0")
gi.require_version("Gtk4LayerShell", "1.0")
gi.require_version("WebKit", "6.0")

from gi.repository import Gtk, GLib, WebKit, Gtk4LayerShell as LayerShell

# TODO: Communicate sock names so that multiple users dont conflict
SOCK = f"/tmp/eden-em.sock"
server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
if os.path.exists(SOCK):
    try:
        os.unlink(SOCK)
    except: 
        print("error on unlinking the sock (line 21)")


server.bind(SOCK)
server.listen(5)
server.setblocking(False)
print(f"Listening on unix socket {SOCK}")


def read_socket(window):
    try: 
        data = None
        conn, _ = server.accept()

        with conn:
            data = conn.recv(1024).decode("utf-8")
            print(f"Got {data}")
        if data == "toggle": 
            if window.get_visible():
                window.set_visible(False)
            else:
                window.present()

    except BlockingIOError:
        pass
    return GLib.SOURCE_CONTINUE



def activate(app):
    window = Gtk.Window(application=app)
    display = window.get_display()
    monitor = display.get_monitors().get_item(0)
    geometry = monitor.get_geometry()
    window.set_default_size(640, geometry.height)
    window.set_decorated(False)
    window.set_resizable(False)

    LayerShell.init_for_window(window)
    LayerShell.set_layer(window, LayerShell.Layer.OVERLAY)
    #LayerShell.set_keyboard_mode(window, LayerShell.KeyboardMode.NONE)
    LayerShell.set_namespace(window, "eden-overlay")
    #LayerShell.set_exclusive_zone(window, -1)
    LayerShell.set_keyboard_mode(
        window,
        LayerShell.KeyboardMode.ON_DEMAND
    )
    LayerShell.set_anchor(window, LayerShell.Edge.RIGHT, True)
    LayerShell.set_anchor(window, LayerShell.Edge.TOP, True)

    webview = WebKit.WebView()
    webview.load_uri("http://127.0.0.1:3333")
    settings = webview.get_settings()
    settings.set_enable_developer_extras(True)

    window.set_child(webview)

    window.connect("close-request", lambda window: True)
    window.present()
    # Ideally I would just make a wrapper function but god hath given lambdas and i will abuse them
    GLib.timeout_add(100, lambda: read_socket(window))
    window.set_visible(False)
    return window

# I dont think an app id is needed but if i need to do it in the future i dont wanna dig through a bunch of code
app = Gtk.Application(application_id="com.em.eden")
app.connect("activate", activate)
app.run(None)