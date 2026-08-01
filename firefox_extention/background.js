console.log("Pinterest2Tg INIT");

var port = browser.runtime.connectNative("Pinterest2Tg");

port.onMessage.addListener((response) => {
    console.log("Received: ", response);
});

// Отлов ошибок подключения к Python
port.onDisconnect.addListener((p) => {
    if (p.error) {
        console.error("Native Messaging Error: ", p.error.message);
    } else {
        console.log("Port disconnected");
    }
});

browser.browserAction.onClicked.addListener(() => {
    console.log("Sending: ping");
    port.postMessage("ping");
});