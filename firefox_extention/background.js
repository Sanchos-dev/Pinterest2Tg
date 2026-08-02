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
                let video = document.querySelector('video[data-test-id="duplo-hls-video"]') 
                         || document.querySelector('video');
                if (video) {
                    let source = video.querySelector('source');
                    if (source && source.src && source.src.startsWith('http')) {
                        return { type: 'video', url: source.src };
                    }
                    let scripts = document.querySelectorAll('script');
                    for (let s of scripts) {
                        if (s.textContent && s.textContent.includes('v1.pinimg.com')) {
                            let match = s.textContent.match(/https?:\\?\/\\?\/v1\.pinimg\.com[^\s"']+\.(mp4|m3u8)/i);
                            if (match) {
                                let cleanUrl = match[0].replace(/\\/g, '');
                                return { type: 'video', url: cleanUrl };
                            }
                        }
                    }
                }
                let img = document.querySelector('img[elementtiming="StoryPinImageBlock-MainPinImage"]') 
                       || document.querySelector('img.iFOUS5');
                if (img && img.src) {
                    return { type: 'image', url: img.src };
                }
                return null;
            })();
        `
    });

    let media = results[0];

    if (media) {
        if (media.type === 'video') {
            console.log("vid:", media.url);
            port.postMessage(media.url);
        } else if (media.type === 'image') {
            let originalUrl = media.url.replace(/\/(236x|474x|564x|736x)\//, '/originals/');
            console.log("pic:", originalUrl);
            port.postMessage(originalUrl);
        }
    } else {
        console.error("NO MEDIA ON THE PAGE / PARSING ERROR");
    }
});