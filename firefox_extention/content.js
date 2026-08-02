function injectDownloadButton() {
    if (document.getElementById("p2tg-dwn-btn")) return;
    let video = document.querySelector('video[data-test-id="duplo-hls-video"]')
             || document.querySelector('video');
    let isVideo = !!video;
    let targetContainer = null;
    let likeBtn = null;
    if (isVideo) {
        likeBtn = document.querySelector('button[data-test-id="react-button"]');
        if (!likeBtn) return;
        targetContainer = likeBtn.parentElement;
    } else {
        let img = document.querySelector('img[elementtiming="StoryPinImageBlock-MainPinImage"]')
               || document.querySelector('img.iFOUS5');
        if (!img) return;
        targetContainer = img.closest('[data-test-id="pin-closeup-image"]')
                       || img.closest('[data-test-id="story-pin-component"]')
                       || img.closest('[data-test-id="story-pin-main-container"]')
                       || img.parentElement;
        if (!targetContainer) return;
        let currentPos = window.getComputedStyle(targetContainer).position;
        if (currentPos === 'static') {
            targetContainer.style.position = 'relative';
        }
    }
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
        let mediaUrl = null;
        if (isVideo) {
            let source = video.querySelector('source');
            if (source && source.src && source.src.startsWith('http')) {
                mediaUrl = source.src;
            } else {
                let scripts = document.querySelectorAll('script');
                for (let s of scripts) {
                    if (s.textContent && s.textContent.includes('v1.pinimg.com')) {
                        let match = s.textContent.match(/https?:\\?\/\\?\/v1\.pinimg\.com[^\s"']+\.(mp4|m3u8)/i);
                        if (match) {
                            mediaUrl = match[0].replace(/\\/g, '');
                            break;
                        }
                    }
                }
            }
        } else {
            let img = document.querySelector('img[elementtiming="StoryPinImageBlock-MainPinImage"]')
                   || document.querySelector('img.iFOUS5');
            if (img && img.src) {
                mediaUrl = img.src;
            }
        }
        if (mediaUrl) {
            btn.innerText = "Sending...";
            btn.style.backgroundColor = "#555";

            browser.runtime.sendMessage({ action: "download_pin", url: mediaUrl }).then(() => {
                btn.innerText = "Done!";
                btn.style.backgroundColor = "#2e7d32";
                setTimeout(() => {
                    btn.innerText = "tg";
                    btn.style.backgroundColor = "#e60023";
                }, 2000);
            });
        } else {
            alert("No Media!");
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