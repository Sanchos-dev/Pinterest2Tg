#!/usr/bin/env python3
import sys
import json
import struct

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

while True:
    try:
        receivedMessage = getMessage()
        if "https://" in receivedMessage or "http://" in receivedMessage:
            sendMessage(encodeMessage("rcv: " + receivedMessage))
    except Exception as e:
        with open("/tmp/pinterest_app.log", "a") as f:
            f.write(f"Error: {str(e)}\n")
        sys.exit(1)