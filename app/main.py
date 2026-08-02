#!/usr/bin/env python3
import sys
import json
import struct
import os
import urllib.request

current_dir = os.path.dirname(os.path.abspath(__file__))

def getMessage():
    rawLength = sys.stdin.buffer.read(4)
    if len(rawLength) == 0:
        sys.exit(0)
    messageLength = struct.unpack('@I', rawLength)[0]
    message = sys.stdin.buffer.read(messageLength).decode('utf-8')
    return json.loads(message)

def encodeMessage(messageContent):
    encodedContent = json.dumps(messageContent).encode('utf-8')
    encodedLength = struct.pack('@I', len(encodedContent))
    return {'length': encodedLength, 'content': encodedContent}


def sendMessage(encodedMessage):
    sys.stdout.buffer.write(encodedMessage['length'])
    sys.stdout.buffer.write(encodedMessage['content'])
    sys.stdout.buffer.flush()

def download_media_file(url):
    media_folder = current_dir + "/media"

    if not os.path.exists(media_folder):
        os.makedirs(media_folder)

    file_name = url.split("/")[-1]

    if "?" in file_name:
        file_name = file_name.split("?")[0]

    full_save_path = media_folder + "/" + file_name

    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

    response = urllib.request.urlopen(req)

    data = response.read()

    f = open(full_save_path, "wb")
    f.write(data)
    f.close()
    
    return file_name

while True:
    try:
        received_data = getMessage()

        if isinstance(received_data, str):
            if "https://" in received_data or "http://" in received_data:
                saved_file_name = download_media_file(received_data)
                ans = "Saved: " + str(saved_file_name)
                sendMessage(encodeMessage(ans))
    except Exception as err:
        log_file = open(current_dir + "/error.log", "a")
        log_file.write("Error happened: " + str(err) + "\n")
        log_file.close()
        sys.exit(1)