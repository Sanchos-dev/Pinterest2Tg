console.log("Pinterest2Tg INIT");

var port = browser.runtime.connectNative("Pinterest2Tg");
port.onMessage.addListener((response) => {

    console.log("py: ", response);
});

port.onDisconnect.addListener((p) => {
    if (p.error) {
        console.error("Native Messaging Error: ", p.error.message);
    } else {
        console.log("Port disconnected");
    }
});
browser.browserAction.onClicked.addListener(async (tab) => {
    let results = await browser.tabs.executeScript(tab.id, {
        code: `
            (() => {
                let img = document.querySelector('img[elementtiming="StoryPinImageBlock-MainPinImage"]') 
                       || document.querySelector('img.iFOUS5');
                if (img) {
                    return img.src;
                }
                return null;
            })();
        `
    });

    let imageUrl = results[0];

    if (imageUrl) {
        let originalUrl = imageUrl.replace(/\/(236x|474x|564x|736x)\//, '/originals/');
        port.postMessage(originalUrl);
    } else {
        console.error("NO PIC ON THE PAGE / PARSING ERROR");
    }
});