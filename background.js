/**
 * imoji Enterprise Background System v20.0
 * Architecture: Service Worker with LRU Caching and Circuit Breaker Pattern
 * @author R H A Ashan Imalka 
 */

// --- Configuration Constants ---
const CONFIG = {
  API_ENDPOINT: "https://imoji-server-production.up.railway.app/get-ai-response",
  TIMEOUT_MS: 25000,
  CACHE_TTL_MS: 1000 * 60 * 60, // 1 Hour Cache
  MAX_CACHE_SIZE: 100,
  CIRCUIT_BREAKER: {
    FAILURE_THRESHOLD: 3,
    RESET_TIMEOUT_MS: 30000 // 30 seconds cooldown after failures
  }
};

// --- State Management ---
const STATE = {
  consecutiveFailures: 0,
  circuitOpenTime: 0,
  cache: new Map() // Map<string, {timestamp: number, data: string}>
};

// --- Lifecycle Hooks ---
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    initializeDefaults();
  }
  setupContextMenu();
});

function initializeDefaults() {
  const defaultSchema = {
    emojis: {
      ':lol:': '😂', ':heart:': '❤️', ':thumbsup:': '👍', 
      ':rocket:': '🚀', ':fire:': '🔥', ':check:': '✅', 
      ':warning:': '⚠️', ':bug:': '🐛'
    },
    stats: {
      savedSeconds: 0,
      aiQueries: 0,
      emojisExpanded: 0
    },
    isEnabled: true,
    aiModel: 'deepseek/deepseek-chat:free'
  };
  chrome.storage.sync.set(defaultSchema);
}

function setupContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "imoji-enterprise-context",
      title: "Ask imoji Intelligence about '%s'",
      contexts: ["selection"]
    });
  });
}

// --- Context Menu Handler ---
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "imoji-enterprise-context" && info.selectionText) {
    safeSendMessage(tab.id, {
      action: "trigger_ai_overlay",
      payload: info.selectionText
    });
  }
});

// --- Networking Core (The Enterprise Part) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "execute_ai_query") {
    executeSmartQuery(request.prompt, request.model)
      .then(response => sendResponse(response))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async
  }
  
  if (request.action === "telemetry_event") {
    updateTelemetry(request.metric);
  }
});

async function executeSmartQuery(prompt, model) {
  const cacheKey = `query:${model}:${prompt.trim().toLowerCase()}`;

  // 1. Circuit Breaker Check
  if (isCircuitOpen()) {
    return { 
      success: false, 
      error: "Service temporarily unavailable due to high failure rate. Retrying in 30s." 
    };
  }

  // 2. Cache Check (High Performance)
  const cached = getCache(cacheKey);
  if (cached) {
    console.log("[imoji Core] Cache Hit - Zero Latency");
    return { success: true, text: cached, source: 'edge_cache' };
  }

  // 3. Network Request
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);

    const response = await fetch(CONFIG.API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) throw new Error("Malformed AI Response");

    // Success: Reset Circuit Breaker & Cache Result
    STATE.consecutiveFailures = 0;
    setCache(cacheKey, content);
    
    // Telemetry: Increment query count
    updateTelemetry('aiQueries');

    return { success: true, text: content, source: 'network' };

  } catch (error) {
    STATE.consecutiveFailures++;
    if (STATE.consecutiveFailures >= CONFIG.CIRCUIT_BREAKER.FAILURE_THRESHOLD) {
      STATE.circuitOpenTime = Date.now();
      console.warn("[imoji Core] Circuit Breaker Tripped ⚠️");
    }
    
    const isTimeout = error.name === 'AbortError';
    return { 
      success: false, 
      error: isTimeout ? "Gateway Timeout (30s). Server warming up." : error.message 
    };
  }
}

// --- Helpers ---
function isCircuitOpen() {
  if (STATE.consecutiveFailures < CONFIG.CIRCUIT_BREAKER.FAILURE_THRESHOLD) return false;
  const cooldownElapsed = (Date.now() - STATE.circuitOpenTime) > CONFIG.CIRCUIT_BREAKER.RESET_TIMEOUT_MS;
  if (cooldownElapsed) {
    STATE.consecutiveFailures = 0; // Reset
    return false;
  }
  return true;
}

function getCache(key) {
  const entry = STATE.cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CONFIG.CACHE_TTL_MS) {
    STATE.cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  if (STATE.cache.size >= CONFIG.MAX_CACHE_SIZE) {
    const firstKey = STATE.cache.keys().next().value;
    STATE.cache.delete(firstKey);
  }
  STATE.cache.set(key, { timestamp: Date.now(), data });
}

function updateTelemetry(metric) {
  chrome.storage.sync.get('stats', (data) => {
    const stats = data.stats || { savedSeconds: 0, aiQueries: 0, emojisExpanded: 0 };
    stats[metric] = (stats[metric] || 0) + 1;
    if (metric === 'emojisExpanded') stats.savedSeconds += 2; // Assume 2s saved per emoji
    if (metric === 'aiQueries') stats.savedSeconds += 30; // Assume 30s saved per AI query
    chrome.storage.sync.set({ stats });
  });
}

function safeSendMessage(tabId, message) {
  chrome.tabs.sendMessage(tabId, message).catch(() => {
    // Tab might be a protected page or closed, ignore safely
  });
}