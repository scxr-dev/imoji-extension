// offscreen.js - v17.1 - AI Fetcher

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.target !== 'offscreen' || request.action !== 'getAiResponse') {
        return;
    }

    const YOUR_SERVER_URL = "https://imoji-server-production.up.railway.app/get-ai-response";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    chrome.storage.sync.get('aiModel', ({ aiModel }) => {
        fetch(YOUR_SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: request.prompt,
                model: aiModel || 'deepseek/deepseek-chat:free'
            }),
            signal: controller.signal
        })
        .then(response => response.json())
        .then(data => {
            clearTimeout(timeoutId);
            if (data.error) {
                sendResponse({ success: false, error: data.error.message });
            } else if (data.choices && data.choices[0].message) {
                sendResponse({ success: true, text: data.choices[0].message.content });
            } else {
                sendResponse({ success: false, error: 'Unknown AI response format.' });
            }
        })
        .catch(error => {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                sendResponse({ success: false, error: 'Server took too long to respond (30s). Please retry.' });
            } else {
                sendResponse({ success: false, error: 'Failed to connect to the imoji server.' });
            }
        });
    });

    return true; // Keep the message channel open for the async response
});
