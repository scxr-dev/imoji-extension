// offscreen.js - v14.0 - Now with a 30-second timeout for sleepy servers.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchAiResponse') {
    const YOUR_SERVER_URL = "https://imoji-server-production.up.railway.app/get-ai-response";
    
    // Professional-grade timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout

    fetch(YOUR_SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: request.prompt }),
      signal: controller.signal // Connect the timeout controller to the fetch request
    })
    .then(response => response.json())
    .then(data => {
      clearTimeout(timeoutId); // Success! Cancel the timeout.
      sendResponse(data);
    })
    .catch(error => {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        sendResponse({ error: { message: 'The server took too long to respond. It might be waking up. Please try again in a moment.' } });
      } else {
        sendResponse({ error: { message: 'Failed to connect to the imoji server.' } });
      }
    });
    
    return true;
  }
});

