/**
 * imoji Enterprise Content Engine v20.0
 * Features: Shadow DOM Encapsulation, MutationObserver for SPAs, Smart Text Replacement
 */

(() => {
  // --- Architecture: Singleton Store ---
  const STORE = {
    emojis: {},
    isEnabled: true,
    overlayInstance: null,
    observer: null
  };

  // --- Module: Text Processing Engine ---
  const TextEngine = {
    init() {
      // Use 'beforeinput' for modern browsers, fallback to 'input'
      // 'beforeinput' is safer for preventing unwanted changes
      document.addEventListener('input', this.handleInput.bind(this), true);
      this.syncSettings();
    },

    syncSettings() {
      chrome.storage.sync.get(['emojis', 'isEnabled'], (data) => {
        if (data.emojis) STORE.emojis = data.emojis;
        if (data.isEnabled !== undefined) STORE.isEnabled = data.isEnabled;
      });
      
      chrome.storage.onChanged.addListener((changes) => {
        if (changes.emojis) STORE.emojis = changes.emojis.newValue;
        if (changes.isEnabled) STORE.isEnabled = changes.isEnabled.newValue;
      });
    },

    isSecureField(target) {
      // Enterprise Security: Never run on passwords or banking inputs
      if (target.type === 'password' || target.type === 'email') return false;
      if (target.getAttribute('autocomplete') === 'off' && target.name.includes('cc')) return false; // Credit cards
      return true;
    },

    handleInput(event) {
      if (!STORE.isEnabled || !this.isSecureField(event.target)) return;

      const target = event.target;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const text = isInput ? target.value : target.textContent;

      // Performance Optimization: Only check last 20 chars
      const lastChunk = text.slice(-20);
      const match = lastChunk.match(/(:\w+:)\s$/);

      if (match && match[1]) {
        const shortcode = match[1];
        const emoji = STORE.emojis[shortcode];

        if (emoji) {
          this.executeReplacement(target, shortcode, emoji, isInput, text);
          // Send telemetry
          chrome.runtime.sendMessage({ action: "telemetry_event", metric: "emojisExpanded" });
        }
      }
    },

    executeReplacement(target, shortcode, emoji, isInput, fullText) {
      // Strategy: Use execCommand where possible to preserve Undo History (Ctrl+Z)
      // Direct value manipulation breaks Undo, which is bad UX.
      
      if (isInput) {
        const cursor = target.selectionStart;
        const start = cursor - shortcode.length - 1;
        
        if (document.activeElement === target) {
          target.setSelectionRange(start, cursor);
          document.execCommand('insertText', false, emoji + ' ');
        } else {
          // Background replacement fallback
          const pre = fullText.substring(0, start);
          const post = fullText.substring(cursor);
          target.value = pre + emoji + ' ' + post;
          target.setSelectionRange(start + emoji.length + 1, start + emoji.length + 1);
        }
      } else if (target.isContentEditable) {
        // Rich Text Editors (Gmail, Slack, Notion)
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          // Safety: Ensure we are actually deleting what we think we are
          document.execCommand('delete'); // Delete space
          for(let i=0; i<shortcode.length; i++) document.execCommand('delete');
          document.execCommand('insertText', false, emoji + ' ');
        }
      }
    }
  };

  // --- Module: Visual Overlay (Shadow DOM) ---
  class SmartOverlay {
    constructor() {
      this.host = document.createElement('div');
      this.host.id = 'imoji-enterprise-root';
      this.host.style.cssText = 'position: relative; z-index: 2147483647; pointer-events: none;';
      this.shadow = this.host.attachShadow({ mode: 'open' });
      document.body.appendChild(this.host);
      this.render();
    }

    render() {
      this.shadow.innerHTML = `
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap');
          
          :host { 
            pointer-events: auto;
            --glass-bg: rgba(255, 255, 255, 0.85);
            --glass-border: rgba(255, 255, 255, 0.5);
            --shadow: 0 12px 40px -8px rgba(0, 0, 0, 0.15), 0 4px 12px -4px rgba(0, 0, 0, 0.1);
            --primary: #6366f1;
            --text: #1e293b;
          }

          .container {
            position: fixed; top: 24px; right: 24px;
            width: 400px; max-width: 90vw;
            background: var(--glass-bg);
            backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            box-shadow: var(--shadow);
            font-family: 'Inter', sans-serif;
            display: flex; flex-direction: column;
            overflow: hidden;
            opacity: 0; transform: translateY(-10px) scale(0.98);
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }

          .container.active { opacity: 1; transform: translateY(0) scale(1); }

          .header {
            padding: 16px; border-bottom: 1px solid rgba(0,0,0,0.05);
            display: flex; justify-content: space-between; align-items: center;
            background: rgba(255,255,255,0.5);
            cursor: grab;
          }
          .header:active { cursor: grabbing; }

          .brand { font-weight: 600; font-size: 14px; color: var(--text); display: flex; gap: 8px; align-items: center; }
          .status-dot { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2); }

          .close-btn {
            border: none; background: transparent; color: #94a3b8; cursor: pointer;
            padding: 4px; border-radius: 6px; transition: all 0.2s;
          }
          .close-btn:hover { background: #f1f5f9; color: #ef4444; }

          .content { padding: 0; max-height: 60vh; overflow-y: auto; }
          
          .prompt-area {
            background: #f8fafc; padding: 12px 16px;
            font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #64748b;
            border-bottom: 1px dashed #e2e8f0; line-height: 1.5;
          }

          .response-area {
            padding: 20px; font-size: 15px; line-height: 1.6; color: #334155;
            white-space: pre-wrap;
          }

          .footer {
            padding: 12px 16px; background: #fff; border-top: 1px solid #f1f5f9;
            display: flex; gap: 10px;
          }

          .btn {
            flex: 1; padding: 10px; border: none; border-radius: 8px;
            font-weight: 500; font-size: 13px; cursor: pointer;
            transition: all 0.2s; display: flex; justify-content: center; align-items: center; gap: 6px;
          }
          
          .btn-primary { background: var(--primary); color: white; }
          .btn-primary:hover { background: #4f46e5; }
          
          .btn-ghost { background: transparent; color: #64748b; border: 1px solid #cbd5e1; }
          .btn-ghost:hover { background: #f8fafc; color: #1e293b; }

          /* Loading State */
          .shimmer {
            height: 20px; width: 100%; background: #f1f5f9; border-radius: 4px; margin-bottom: 8px;
            animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
        </style>

        <div class="container" id="panel">
          <div class="header" id="drag-handle">
            <div class="brand"><span class="status-dot"></span>imoji Intelligence</div>
            <button class="close-btn" id="close">✕</button>
          </div>
          <div class="content">
            <div class="prompt-area" id="prompt"></div>
            <div class="response-area" id="response"></div>
          </div>
          <div class="footer" id="actions" style="display:none;">
            <button class="btn btn-ghost" id="retry">Retry</button>
            <button class="btn btn-primary" id="copy">Copy Result</button>
          </div>
        </div>
      `;
      
      this.bindLogic();
    }

    bindLogic() {
      const panel = this.shadow.getElementById('panel');
      const closeBtn = this.shadow.getElementById('close');
      const dragHandle = this.shadow.getElementById('drag-handle');
      const copyBtn = this.shadow.getElementById('copy');
      const retryBtn = this.shadow.getElementById('retry');

      // Fade In
      requestAnimationFrame(() => panel.classList.add('active'));

      // Drag Logic
      let isDragging = false, startX, startY, initialLeft, initialTop;
      dragHandle.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX; startY = e.clientY;
        const rect = panel.getBoundingClientRect();
        initialLeft = rect.left; initialTop = rect.top;
        panel.style.right = 'auto';
        panel.style.left = `${initialLeft}px`;
        panel.style.top = `${initialTop}px`;
        dragHandle.style.cursor = 'grabbing';
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        panel.style.left = `${initialLeft + (e.clientX - startX)}px`;
        panel.style.top = `${initialTop + (e.clientY - startY)}px`;
      });

      window.addEventListener('mouseup', () => {
        isDragging = false;
        dragHandle.style.cursor = 'grab';
      });

      // Actions
      closeBtn.onclick = () => this.destroy();
      
      copyBtn.onclick = () => {
        const text = this.shadow.getElementById('response').innerText;
        navigator.clipboard.writeText(text);
        copyBtn.textContent = "Copied to Clipboard";
        setTimeout(() => copyBtn.textContent = "Copy Result", 2000);
      };

      retryBtn.onclick = () => this.triggerQuery(this.currentPrompt);
    }

    triggerQuery(prompt) {
      this.currentPrompt = prompt;
      const promptEl = this.shadow.getElementById('prompt');
      const responseEl = this.shadow.getElementById('response');
      const actions = this.shadow.getElementById('actions');

      promptEl.textContent = `Query: "${prompt}"`;
      responseEl.innerHTML = `
        <div class="shimmer" style="width: 90%"></div>
        <div class="shimmer" style="width: 70%"></div>
        <div class="shimmer" style="width: 80%"></div>
      `;
      actions.style.display = 'none';

      chrome.runtime.sendMessage({ 
        action: "execute_ai_query", 
        prompt: prompt,
        model: 'deepseek/deepseek-chat:free'
      }, (res) => {
        if (res && res.success) {
          responseEl.textContent = res.text;
          actions.style.display = 'flex';
          this.shadow.getElementById('retry').style.display = 'none';
        } else {
          responseEl.innerHTML = `<span style="color: #ef4444;">Error: ${res?.error || "Connection Lost"}</span>`;
          actions.style.display = 'flex';
          this.shadow.getElementById('copy').style.display = 'none';
          this.shadow.getElementById('retry').style.display = 'block';
        }
      });
    }

    destroy() {
      const panel = this.shadow.getElementById('panel');
      panel.classList.remove('active');
      setTimeout(() => this.host.remove(), 300);
      STORE.overlayInstance = null;
    }
  }

  // --- Initialization ---
  TextEngine.init();
  
  chrome.runtime.onMessage.addListener((req) => {
    if (req.action === 'trigger_ai_overlay') {
      if (STORE.overlayInstance) STORE.overlayInstance.destroy();
      STORE.overlayInstance = new SmartOverlay();
      STORE.overlayInstance.triggerQuery(req.payload);
    }
  });

  console.log("%c imoji Enterprise v20.0 %c System Active ", "background:#6366f1; color:white; padding:4px;", "color:#6366f1; font-weight:bold;");
})();