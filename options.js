// options.js v20.0 - Enterprise Config Manager

document.addEventListener('DOMContentLoaded', () => {
    const UI = {
        form: document.getElementById('add-form'),
        shortcode: document.getElementById('shortcode'),
        emoji: document.getElementById('emoji'),
        list: document.getElementById('list'),
        exportBtn: document.getElementById('export-btn'),
        importBtn: document.getElementById('import-btn'),
        fileInput: document.getElementById('file-input')
    };

    // --- CRUD Operations ---
    async function render() {
        const data = await chrome.storage.sync.get('emojis');
        const emojis = data.emojis || {};
        UI.list.innerHTML = '';

        Object.keys(emojis).sort().forEach(key => {
            const row = document.createElement('div');
            row.className = 'list-item';
            row.innerHTML = `
                <div><span class="code-tag">${key}</span></div>
                <div style="font-size: 20px;">${emojis[key]}</div>
                <button class="del-btn" data-key="${key}">Delete</button>
            `;
            row.querySelector('.del-btn').onclick = () => deleteItem(key);
            UI.list.appendChild(row);
        });
    }

    async function addItem(code, val) {
        if (!code.startsWith(':')) code = ':' + code;
        if (!code.endsWith(':')) code = code + ':';
        
        const data = await chrome.storage.sync.get('emojis');
        const emojis = data.emojis || {};
        emojis[code] = val;
        
        await chrome.storage.sync.set({ emojis });
        render();
    }

    async function deleteItem(key) {
        const data = await chrome.storage.sync.get('emojis');
        const emojis = data.emojis || {};
        delete emojis[key];
        await chrome.storage.sync.set({ emojis });
        render();
    }

    // --- Enterprise Import/Export ---
    function exportConfig() {
        chrome.storage.sync.get(null, (data) => {
            const blob = new Blob([JSON.stringify(data, null, 2)], {type : 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `imoji-config-${new Date().toISOString().slice(0,10)}.json`;
            a.click();
        });
    }

    function importConfig(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const config = JSON.parse(e.target.result);
                if (config.emojis) {
                    chrome.storage.sync.set(config, () => {
                        alert('Configuration imported successfully!');
                        render();
                    });
                }
            } catch (err) {
                alert('Invalid JSON file');
            }
        };
        reader.readAsText(file);
    }

    // --- Listeners ---
    UI.form.addEventListener('submit', (e) => {
        e.preventDefault();
        if(UI.shortcode.value && UI.emoji.value) {
            addItem(UI.shortcode.value.trim(), UI.emoji.value.trim());
            UI.form.reset();
        }
    });

    UI.exportBtn.onclick = exportConfig;
    UI.importBtn.onclick = () => UI.fileInput.click();
    UI.fileInput.onchange = importConfig;

    render();
});