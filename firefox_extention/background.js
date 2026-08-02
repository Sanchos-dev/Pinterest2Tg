console.log("Pinterest2Tg INIT");
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "download_pin" && message.url) {
        console.log("Got URL from page button:", message.url);
        var port = browser.runtime.connectNative("Pinterest2Tg");
        port.onMessage.addListener((response) => {
            console.log("py:", response);
        });
        port.onDisconnect.addListener((p) => {
            if (p.error) {
                console.error("Native Messaging Error:", p.error.message);
            } else {
                console.log("Port disconnected");
            }
        });
        port.postMessage(message.url);
        sendResponse({ status: "sent" });
    }
});