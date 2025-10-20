// background.js - v17.2 - Combined Install Listener

const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html';

// A global promise to avoid concurrency issues
let creatingOffscreenDocument;

// With Manifest V3, we need to create an offscreen document to run the AI model.
async function getOffscreenDocument() {
    if (await chrome.offscreen.hasDocument()) {
        return;
    }
    if (creatingOffscreenDocument) {
        await creatingOffscreenDocument;
    } else {
        creatingOffscreenDocument = chrome.offscreen.createDocument({
            url: OFFSCREEN_DOCUMENT_PATH,
            reasons: ['FETCH'],
            justification: 'To run AI model without interrupting the service worker.',
        });
        await creatingOffscreenDocument;
        creatingOffscreenDocument = null;
    }
}

chrome.runtime.onInstalled.addListener(() => {
    // Create context menu
    chrome.contextMenus.create({
        id: "ask-imoji-ai",
        title: "Ask Imoji about '%s'",
        contexts: ["selection"]
    });

    // Set default values on installation
    chrome.storage.sync.get(['emojis', 'isEnabled', 'aiModel'], (result) => {
        if (result.isEnabled === undefined) chrome.storage.sync.set({ isEnabled: true });
        if (result.aiModel === undefined) chrome.storage.sync.set({ aiModel: 'deepseek/deepseek-chat:free' });
        if (!result.emojis) {
            const defaultEmojis = { ':lol:': '😂', ':heart:': '❤️', ':thumbsup:': '👍' };
            chrome.storage.sync.set({ emojis: defaultEmojis });
        }
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "ask-imoji-ai" && info.selectionText) {
        chrome.tabs.sendMessage(tab.id, {
            action: "showAiPopup",
            prompt: info.selectionText
        });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getAiResponse") {
        (async () => {
            await getOffscreenDocument();
            const response = await chrome.runtime.sendMessage({
                ...request,
                target: 'offscreen'
            });
            sendResponse(response);
        })();
        return true; // Keep the message channel open for the async response
    }
});
