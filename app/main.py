#!/usr/bin/env python3
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

import json
import struct
import urllib.request
import subprocess
import mimetypes
import time
import traceback
from pathlib import Path
import conf


def fix_wayland_env():
    if "XDG_RUNTIME_DIR" not in os.environ:
        os.environ["XDG_RUNTIME_DIR"] = f"/run/user/{os.getuid()}"

    xdg_dir = os.environ["XDG_RUNTIME_DIR"]

    if "WAYLAND_DISPLAY" not in os.environ and os.path.exists(xdg_dir):
        for f in os.listdir(xdg_dir):
            if f.startswith("wayland-") and not f.endswith(".lock"):
                os.environ["WAYLAND_DISPLAY"] = f
                break

    if "HYPRLAND_INSTANCE_SIGNATURE" not in os.environ:
        hypr_paths = [os.path.join(xdg_dir, "hypr"), "/tmp/hypr"]
        for hp in hypr_paths:
            if os.path.exists(hp):
                instances = [
                    d for d in os.listdir(hp)
                    if os.path.exists(os.path.join(hp, d, ".socket.sock"))
                ]
                if instances:
                    instances.sort(key=lambda x: os.path.getmtime(os.path.join(hp, x)), reverse=True)
                    os.environ["HYPRLAND_INSTANCE_SIGNATURE"] = instances[0]
                    break


def SetActiveWindow(app_name: str) -> bool:
    try:
        fix_wayland_env()
        cmd = f'hl.dsp.focus({{ window = "class:.*{app_name}.*" }})'
        res = subprocess.run(
            ["hyprctl", "dispatch", cmd],
            capture_output=True,
            text=True
        )
        if res.returncode != 0:
            cmd2 = f'hl.dsp.focus({{ window = "class:{app_name}" }})'
            res2 = subprocess.run(
                ["hyprctl", "dispatch", cmd2],
                capture_output=True,
                text=True
            )
            if res2.returncode != 0:
                err_msg = res.stderr.strip() or res.stdout.strip() or res2.stderr.strip()
                log_error(f"Hyprctl focus failed for '{app_name}': {err_msg}")
                return False
        return True
    except Exception as e:
        log_error(f"Focus error: {e}")
        return False


def SetPictureInClipboard(file_path: str | Path) -> None:
    fix_wayland_env()
    path = Path(file_path).resolve()
    if not path.is_file():
        raise FileNotFoundError(f"File not found: {path}")

    mime_type, _ = mimetypes.guess_type(path)
    if not mime_type:
        ext = path.suffix.lower()
        if ext == ".mp4":
            mime_type = "video/mp4"
        elif ext in [".png", ".jpg", ".jpeg", ".webp"]:
            mime_type = f"image/{ext.lstrip('.')}"
        else:
            mime_type = "application/octet-stream"

    with open(path, "rb") as f:
        subprocess.run(["wl-copy", "--type", mime_type], stdin=f, check=True)


def send_paste_shortcut():
    fix_wayland_env()
    try:
        subprocess.run(["wtype", "-M", "ctrl", "v", "-m", "ctrl"], check=True)
    except FileNotFoundError:
        try:
            subprocess.run(["ydotool", "key", "29:1", "47:1", "47:0", "29:0"], check=True)
        except Exception:
            log_error("Neither 'wtype' nor 'ydotool' is installed. Please install 'wtype'.")


def p2tg(filepath: str):
    tg_class = getattr(conf, "TgClient", "ayugram")
    SetActiveWindow(tg_class)
    time.sleep(0.3)

    SetPictureInClipboard(filepath)
    time.sleep(0.2)

    send_paste_shortcut()


def read_exact_bytes(stream, num_bytes):
    data = bytearray()
    while len(data) < num_bytes:
        chunk = stream.read(num_bytes - len(data))
        if not chunk:
            return None
        data.extend(chunk)
    return bytes(data)


def getMessage():
    rawLength = read_exact_bytes(sys.stdin.buffer, 4)
    if not rawLength or len(rawLength) == 0:
        sys.exit(0)
    messageLength = struct.unpack('@I', rawLength)[0]
    rawMessage = read_exact_bytes(sys.stdin.buffer, messageLength)
    if not rawMessage:
        sys.exit(0)
    return json.loads(rawMessage.decode('utf-8'))


def encodeMessage(messageContent):
    encodedContent = json.dumps(messageContent).encode('utf-8')
    encodedLength = struct.pack('@I', len(encodedContent))
    return {'length': encodedLength, 'content': encodedContent}


def sendMessage(encodedMessage):
    sys.stdout.buffer.write(encodedMessage['length'])
    sys.stdout.buffer.write(encodedMessage['content'])
    sys.stdout.buffer.flush()


def download_media_file(url: str) -> str:
    media_folder = os.path.join(current_dir, "media")
    os.makedirs(media_folder, exist_ok=True)

    clean_url = url.split("?")[0].split("#")[0]
    file_name = clean_url.split("/")[-1]

    if not file_name:
        file_name = "downloaded_media.jpg"

    if ".m3u8" in file_name or ".m3u8" in url:
        mp4_file_name = file_name.replace(".m3u8", ".mp4") if ".m3u8" in file_name else "video.mp4"
        full_save_path = os.path.join(media_folder, mp4_file_name)

        cmd = ["ffmpeg", "-y", "-i", url, "-c", "copy", full_save_path]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return mp4_file_name

    full_save_path = os.path.join(media_folder, file_name)

    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        with open(full_save_path, "wb") as f:
            f.write(response.read())

    return file_name


def log_error(msg: str):
    with open(os.path.join(current_dir, "error.log"), "a", encoding="utf-8") as log_file:
        log_file.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}\n")


def main():
    while True:
        try:
            received_data = getMessage()

            url = None
            if isinstance(received_data, str):
                url = received_data
            elif isinstance(received_data, dict):
                url = received_data.get("url") or received_data.get("src")

            if url and ("https://" in url or "http://" in url):
                saved_file_name = download_media_file(url)
                ans = {"status": "ok", "file": saved_file_name}
                sendMessage(encodeMessage(ans))

                just_save = getattr(conf, "JustSave", False)
                if not just_save:
                    p2tg(os.path.join(current_dir, "media", saved_file_name))

        except Exception:
            log_error(traceback.format_exc())


if __name__ == "__main__":
    main()