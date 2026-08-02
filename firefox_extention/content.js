console.log("[Pinterest2Tg] Content script loaded.");

let lastUrl = location.href;

function findVideoInPerformance(posterHash) {
    try {
        let entries = Array.from(performance.getEntriesByType('resource')).reverse();

        if (posterHash) {
            for (let e of entries) {
                if (e.name && e.name.includes('v1.pinimg.com') && e.name.includes(posterHash)) {
                    let match = e.name.match(/https?:\/\/[^\s"']+\.(mp4|m3u8)/i);
                    if (match) return match[0];
                }
            }
        }

        for (let e of entries) {
            if (e.name && e.name.includes('v1.pinimg.com') && (e.name.includes('.mp4') || e.name.includes('.m3u8'))) {
                let match = e.name.match(/https?:\/\/[^\s"']+\.(mp4|m3u8)/i);
                if (match) return match[0];
            }
        }
    } catch (err) {
        console.warn("[Pinterest2Tg] Performance API error:", err);
    }
    return null;
}

function isValidPinImage(img) {
    if (!img || !img.src || !img.src.startsWith('http')) return false;

    let src = img.src.toLowerCase();
    if (src.includes('75x75') || src.includes('30x30') || src.includes('140x140') || 
        src.includes('150x150') || src.includes('280x280') || src.includes('_rs') || 
        src.includes('/avatars/')) {
        return false;
    }

    if (img.width > 0 && img.width <= 150) return false;
    if (img.height > 0 && img.height <= 150) return false;

    if (img.closest('header') || img.closest('nav')) {
        return false;
    }

    return true;
}

function getActiveMediaElement() {
    let video = document.querySelector('video[data-test-id="duplo-hls-video"]')
             || document.querySelector('video');

    if (video) {
        return { type: 'video', el: video };
    }

    let priorityImg = document.querySelector('img[elementtiming="StoryPinImageBlock-MainPinImage"]')
                   || document.querySelector('img.iFOUS5');

    if (priorityImg && isValidPinImage(priorityImg)) {
        return { type: 'image', el: priorityImg };
    }

    let imgs = Array.from(document.querySelectorAll('img'));
    for (let img of imgs) {
        if (isValidPinImage(img)) {
            return { type: 'image', el: img };
        }
    }

    return null;
}

function getActiveMediaUrl() {
    let pinId = location.pathname.match(/\/pin\/(\d+)/)?.[1];
    console.log("[Pinterest2Tg] Resolving media URL for Pin ID:", pinId || "unknown");

    let activeVideo = document.querySelector('video[data-test-id="duplo-hls-video"]')
                   || document.querySelector('video');

    if (activeVideo) {
        let source = activeVideo.querySelector('source');
        if (source && source.src && source.src.startsWith('http')) {
            console.log("[Pinterest2Tg] Found video URL in <source>:", source.src);
            return source.src;
        }
        if (activeVideo.src && activeVideo.src.startsWith('http')) {
            console.log("[Pinterest2Tg] Found video URL in <video.src>:", activeVideo.src);
            return activeVideo.src;
        }

        let posterHash = null;
        if (activeVideo.poster) {
            let hashMatch = activeVideo.poster.match(/\/([a-f0-9]{32})\./i);
            if (hashMatch) {
                posterHash = hashMatch[1];
                console.log("[Pinterest2Tg] Extracted video poster hash:", posterHash);
            }
        }

        let perfUrl = findVideoInPerformance(posterHash);
        if (perfUrl) {
            console.log("[Pinterest2Tg] Found video URL via Performance Network API:", perfUrl);
            return perfUrl;
        }

        let scripts = Array.from(document.querySelectorAll('script')).reverse();

        if (posterHash) {
            for (let s of scripts) {
                if (s.textContent && s.textContent.includes('v1.pinimg.com') && s.textContent.includes(posterHash)) {
                    let match = s.textContent.match(/https?:\\?\/\\?\/v1\.pinimg\.com[^\s"']+\.(mp4|m3u8)/i);
                    if (match) {
                        let url = match[0].replace(/\\/g, '');
                        console.log("[Pinterest2Tg] Matched video URL by poster hash in script:", url);
                        return url;
                    }
                }
            }
        }

        if (pinId) {
            for (let s of scripts) {
                if (s.textContent && s.textContent.includes('v1.pinimg.com') && s.textContent.includes(pinId)) {
                    let match = s.textContent.match(/https?:\\?\/\\?\/v1\.pinimg\.com[^\s"']+\.(mp4|m3u8)/i);
                    if (match) {
                        let url = match[0].replace(/\\/g, '');
                        console.log("[Pinterest2Tg] Matched video URL by Pin ID in script:", url);
                        return url;
                    }
                }
            }
        }

        if (activeVideo.poster && activeVideo.poster.startsWith('http')) {
            console.log("[Pinterest2Tg] Fallback to video poster URL:", activeVideo.poster);
            return activeVideo.poster;
        }
    }

    let mediaData = getActiveMediaElement();
    if (mediaData && mediaData.type === 'image' && mediaData.el.src) {
        console.log("[Pinterest2Tg] Found image URL:", mediaData.el.src);
        return mediaData.el.src;
    }

    console.warn("[Pinterest2Tg] Failed to resolve media URL.");
    return null;
}

function injectDownloadButton() {
    if (location.href !== lastUrl) {
        console.log("[Pinterest2Tg] Page change detected:", location.href);
        lastUrl = location.href;
        let oldBtn = document.getElementById("p2tg-dwn-btn");
        if (oldBtn) {
            console.log("[Pinterest2Tg] Removing old button.");
            oldBtn.remove();
        }
    }

    let mediaData = getActiveMediaElement();
    if (!mediaData) return;

    let mediaEl = mediaData.el;
    let isVideo = mediaData.type === 'video';

    let container = mediaEl.closest('[data-test-id="pin-closeup-image"]')
                 || mediaEl.closest('[data-test-id="story-pin-component"]')
                 || mediaEl.closest('[data-test-id="story-pin-main-container"]')
                 || mediaEl.parentElement;

    if (!container) return;

    if (window.getComputedStyle(container).height === '0px' && container.parentElement) {
        container = container.parentElement;
    }

    let targetContainer = null;
    let likeBtn = null;

    if (isVideo) {
        likeBtn = document.querySelector('button[data-test-id="react-button"]')
               || document.querySelector('button[aria-label="Отреагировать"]')
               || document.querySelector('button[aria-label*="реакц"]')
               || document.querySelector('button[aria-label*="React"]');

        if (!likeBtn) return;
        targetContainer = likeBtn.parentElement;
    } else {
        targetContainer = container;
        let currentPos = window.getComputedStyle(targetContainer).position;
        if (currentPos === 'static') {
            targetContainer.style.position = 'relative';
        }
    }

    let existingBtn = document.getElementById("p2tg-dwn-btn");
    if (existingBtn) {
        if (existingBtn.parentElement !== targetContainer) {
            console.log("[Pinterest2Tg] Button target container changed. Re-injecting.");
            existingBtn.remove();
        } else {
            return;
        }
    }

    console.log("[Pinterest2Tg] Injecting 'tg' button (isVideo:", isVideo, ")");

    let btn = document.createElement("button");
    btn.id = "p2tg-dwn-btn";
    btn.innerText = "tg";
    btn.type = "button";

    if (isVideo) {
        Object.assign(btn.style, {
            backgroundColor: '#e60023',
            color: '#ffffff',
            border: 'none',
            borderRadius: '24px',
            padding: '0 16px',
            height: '44px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginRight: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            transition: 'transform 0.1s ease'
        });
    } else {
        Object.assign(btn.style, {
            position: 'absolute',
            top: '15px',
            right: '15px',
            zIndex: '999999',
            backgroundColor: '#e60023',
            color: '#ffffff',
            border: 'none',
            borderRadius: '20px',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            pointerEvents: 'auto'
        });
    }

    btn.onmouseover = () => btn.style.transform = 'scale(1.04)';
    btn.onmouseout = () => btn.style.transform = 'scale(1)';

    btn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log("[Pinterest2Tg] Button 'tg' clicked.");

        let mediaUrl = getActiveMediaUrl();

        if (mediaUrl) {
            console.log("[Pinterest2Tg] Sending URL to background script:", mediaUrl);
            btn.innerText = "Sending...";
            btn.style.backgroundColor = "#555";

            browser.runtime.sendMessage({ action: "download_pin", url: mediaUrl }).then(() => {
                console.log("[Pinterest2Tg] URL sent successfully.");
                btn.innerText = "Done!";
                btn.style.backgroundColor = "#2e7d32";
                setTimeout(() => {
                    btn.innerText = "tg";
                    btn.style.backgroundColor = "#e60023";
                }, 2000);
            });
        } else {
            console.error("[Pinterest2Tg] Media URL resolution failed on click.");
            alert("Медиафайл не найден!");
        }
    };

    if (isVideo && likeBtn) {
        targetContainer.insertBefore(btn, likeBtn);
    } else {
        targetContainer.appendChild(btn);
    }
}

const observer = new MutationObserver(() => {
    injectDownloadButton();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

injectDownloadButton();
setInterval(injectDownloadButton, 500);