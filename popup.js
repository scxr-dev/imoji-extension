// popup.js v20.0 - Dashboard Controller

document.addEventListener('DOMContentLoaded', async () => {
    // Elements
    const els = {
        toggle: document.getElementById('enabled-toggle'),
        status: document.getElementById('status-text'),
        timeSaved: document.getElementById('time-saved'),
        queries: document.getElementById('queries'),
        settingsBtn: document.getElementById('settings-btn'),
        helpBtn: document.getElementById('help-btn')
    };

    // Load Data
    const data = await chrome.storage.sync.get(['isEnabled', 'stats']);
    
    // Init UI State
    els.toggle.checked = data.isEnabled !== false;
    updateStatusUI(els.toggle.checked);
    
    // Render Stats
    const stats = data.stats || { savedSeconds: 0, aiQueries: 0 };
    els.timeSaved.textContent = formatTime(stats.savedSeconds);
    els.queries.textContent = stats.aiQueries.toLocaleString();

    // Listeners
    els.toggle.addEventListener('change', () => {
        const isActive = els.toggle.checked;
        chrome.storage.sync.set({ isEnabled: isActive });
        updateStatusUI(isActive);
    });

    els.settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
    els.helpBtn.addEventListener('click', () => chrome.tabs.create({ url: 'instructions.html' })); // Ensure instructions.html exists or create it
});

function updateStatusUI(active) {
    const statusEl = document.getElementById('status-text');
    if (active) {
        statusEl.textContent = "System Active";
        statusEl.style.color = "#16a34a";
    } else {
        statusEl.textContent = "System Paused";
        statusEl.style.color = "#94a3b8";
    }
}

function formatTime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const min = Math.floor(seconds / 60);
    return `${min}m`;
}