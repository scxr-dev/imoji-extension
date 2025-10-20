// options.js - v12.0 - Redesigned and Optimized

document.addEventListener('DOMContentLoaded', () => {
    const addForm = document.getElementById('add-emoji-form');
    const shortcodeInput = document.getElementById('shortcode');
    const emojiInput = document.getElementById('emoji');
    const emojiList = document.getElementById('emoji-list');
    const statusDiv = document.getElementById('status');
    let statusTimeout;

    function showStatus() {
        clearTimeout(statusTimeout);
        statusDiv.classList.add('show');
        statusTimeout = setTimeout(() => {
            statusDiv.classList.remove('show');
        }, 2000);
    }

    function saveEmojis(emojis) {
        chrome.storage.sync.set({ emojis }, () => {
            showStatus();
            renderEmojiList();
        });
    }

    function renderEmojiList() {
        chrome.storage.sync.get('emojis', (data) => {
            const emojis = data.emojis || {};
            emojiList.innerHTML = '';
            if (Object.keys(emojis).length === 0) {
                emojiList.innerHTML = '<li>No custom emojis yet. Add one above!</li>';
                return;
            }
            const sortedShortcodes = Object.keys(emojis).sort();
            for (const shortcode of sortedShortcodes) {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="emoji-item-text">${shortcode} → ${emojis[shortcode]}</span>
                    <button class="delete-btn" data-shortcode="${shortcode}">Delete</button>
                `;
                emojiList.appendChild(li);
            }
        });
    }

    addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        let shortcode = shortcodeInput.value.trim();
        const emoji = emojiInput.value.trim();
        if (!shortcode || !emoji) return;
        if (!shortcode.startsWith(':')) shortcode = `:${shortcode}`;
        if (!shortcode.endsWith(':')) shortcode = `${shortcode}:`;

        chrome.storage.sync.get('emojis', (data) => {
            const emojis = data.emojis || {};
            emojis[shortcode] = emoji;
            saveEmojis(emojis);
            addForm.reset();
            shortcodeInput.focus();
        });
    });

    emojiList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const shortcodeToDelete = e.target.dataset.shortcode;
            chrome.storage.sync.get('emojis', (data) => {
                const emojis = data.emojis || {};
                delete emojis[shortcodeToDelete];
                saveEmojis(emojis);
            });
        }
    });

    renderEmojiList();
});

