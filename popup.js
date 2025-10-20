// popup.js - v12.0 - Redesigned and Simplified

document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('enabled-toggle');
    const optionsBtn = document.getElementById('options-btn');
    const helpBtn = document.getElementById('help-btn');

    chrome.storage.sync.get('isEnabled', (data) => {
        toggle.checked = data.isEnabled !== false;
    });

    toggle.addEventListener('change', () => {
        chrome.storage.sync.set({ isEnabled: toggle.checked });
    });

    optionsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    helpBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('instructions.html') });
    });
});

