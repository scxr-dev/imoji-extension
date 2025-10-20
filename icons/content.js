// content.js - v16.0 - Zero Error Edition with Shadow DOM
console.log("imoji [v16.0] loaded. Zero Error Edition.");

let emojiMap = {};
let isEnabled = true;

function showAiPopup(prompt) {
    const existingHost = document.getElementById('imoji-popup-host');
    if (existingHost) existingHost.remove();

    const host = document.createElement('div');
    host.id = 'imoji-popup-host';
    document.body.appendChild(host);

    const shadowRoot = host.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = `
        <style>
            :host { all: initial; font-family: 'Inter', sans-serif, system-ui; }
            .popup-wrapper { position: fixed; top: 20px; right: 20px; width: 360px; background: white; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2); z-index: 2147483647; resize: both; overflow: hidden; min-width: 300px; min-height: 200px; display: flex; flex-direction: column; border: 1px solid #e2e8f0; }
            .popup-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #475569; font-weight: 600; font-size: 14px; cursor: move; user-select: none; flex-shrink: 0; }
            .close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #94a3b8; padding: 0; line-height: 1; }
            .prompt { padding: 12px 16px; background: #f8fafc; color: #475569; border-bottom: 1px solid #f1f5f9; font-size: 14px; max-height: 80px; overflow-y: auto; font-style: italic; flex-shrink: 0; }
            .content-wrapper { padding: 16px; flex-grow: 1; overflow-y: auto; }
            .content { color: #1e293b; font-size: 15px; line-height: 1.6; white-space: pre-wrap; }
            .error-state { display: none; }
            .error-state p { margin: 0; color: #b91c1c; }
            .actions { padding: 0 16px 16px; border-top: 1px solid #f1f5f9; flex-shrink: 0; }
            .btn { width: 100%; background-color: #4f46e5; color: white; border: none; padding: 10px; font-size: 14px; font-weight: 600; border-radius: 8px; cursor: pointer; transition: background-color 0.2s; margin-top: 12px; }
            .btn:hover { background-color: #4338ca; }
            .copy-btn.copied { background-color: #16a34a; }
        </style>
        <div class="popup-wrapper" id="imoji-popup-main">
            <div class="popup-header" id="imoji-popup-header"><span>Ask Imoji about...</span><button class="close-btn">&times;</button></div>
            <div class="prompt"></div>
            <div class="content-wrapper"><div class="content">imoji is thinking... 🤔</div><div class="error-state"><p></p><button class="btn retry-btn">Retry</button></div></div>
            <div class="actions" style="display: none;"><button class="btn copy-btn">Copy Text</button></div>
        </div>
    `;

    const popup = shadowRoot.getElementById('imoji-popup-main');
    const header = shadowRoot.getElementById('imoji-popup-header');
    const promptDiv = shadowRoot.querySelector('.prompt');
    const contentDiv = shadowRoot.querySelector('.content');
    const errorDiv = shadowRoot.querySelector('.error-state');
    const actionsDiv = shadowRoot.querySelector('.actions');
    const copyBtn = shadowRoot.querySelector('.copy-btn');

    promptDiv.textContent = prompt;

    let isDragging = false, offsetX = 0, offsetY = 0;
    header.onmousedown = (e) => {
        isDragging = true;
        offsetX = e.clientX - popup.offsetLeft;
        offsetY = e.clientY - popup.offsetTop;
        document.onmousemove = (e) => {
            if (!isDragging) return;
            popup.style.left = `${e.clientX - offsetX}px`;
            popup.style.top = `${e.clientY - offsetY}px`;
        };
        document.onmouseup = () => { isDragging = false; document.onmousemove = null; document.onmouseup = null; };
    };
    
    shadowRoot.querySelector('.close-btn').onclick = () => host.remove();
    shadowRoot.querySelector('.retry-btn').onclick = () => getResponse();
    
    function getResponse() {
        contentDiv.style.display = 'block';
        errorDiv.style.display = 'none';
        contentDiv.textContent = 'imoji is thinking... 🤔';

        chrome.runtime.sendMessage({ action: "getAiResponse", prompt: prompt }, (response) => {
            if (response && response.success) {
                contentDiv.textContent = response.text;
                actionsDiv.style.display = 'block';
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(response.text);
                    copyBtn.textContent = 'Copied!';
                    copyBtn.classList.add('copied');
                    setTimeout(() => { copyBtn.textContent = 'Copy Text'; copyBtn.classList.remove('copied'); }, 2000);
                };
            } else {
                contentDiv.style.display = 'none';
                errorDiv.style.display = 'block';
                errorDiv.querySelector('p').textContent = `[Error: ${response ? response.error : 'Unknown error.'}]`;
            }
        });
    }
    
    getResponse();
}

document.body.addEventListener('input', (event) => {
    if (!isEnabled) return;
    const el = event.target;
    if (!el || !(el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.isContentEditable)) return;
    const text = el.isContentEditable ? el.textContent : el.value;
    
    const emojiMatch = text.match(/(:\w+:)\s$/);
    if (emojiMatch && emojiMatch[1] && emojiMap[emojiMatch[1]]) {
        el.setSelectionRange(text.length - emojiMatch[0].length, text.length);
        document.execCommand('delete', false, null);
        document.execCommand('insertText', false, emojiMap[emojiMatch[1]] + '\u00A0');
    }
}, true);

chrome.runtime.onMessage.addListener((request) => { if (request.action === "showAiPopup") showAiPopup(request.prompt); });
chrome.storage.onChanged.addListener((changes) => {
    if (changes.emojis) emojiMap = changes.emojis.newValue;
    if (changes.isEnabled) isEnabled = changes.isEnabled.newValue;
});
chrome.storage.sync.get(['emojis', 'isEnabled'], (data) => {
    if (data.emojis) emojiMap = data.emojis;
    if (data.isEnabled !== undefined) isEnabled = data.isEnabled;
});

