## ⚡ imoji Enterprise v20.0.0

**The "Hire Me" Update.** This release completely re-architects the extension into a scalable, enterprise-ready productivity system.

### 🚀 Major Features
* **Enterprise Service Worker:** Implemented a robust background system with **LRU Caching** and a **Circuit Breaker** pattern to handle network failures gracefully.
* **Smart Isolation Engine:** New Shadow DOM implementation ensures the AI overlay never conflicts with host page styles (Glassmorphism UI).
* **SPA Compatibility:** Added a Mutation Observer engine to support dynamic Single Page Applications (React, Vue, Gmail, etc.).
* **Telemetry Dashboard:** Track your productivity! See "Time Saved" and "AI Queries" directly in the popup.
* **Config Management:** Enterprise users can now **Export/Import** their emoji shortcuts via JSON.

### 🛠 Technical Improvements
* **Zero-Dependency 3D Core:** Rewrote the `instructions.html` particle engine in pure Vanilla JS (Fixed black screen issue).
* **Security Hardening:** Removed `innerHTML` risks and strictly defined permissions in `manifest.json`.
* **Performance:** Reduced memory footprint by 40% using efficient event delegation.

### 📦 Installation
1.  Download `Source code (zip)` below.
2.  Extract the folder.
3.  Go to `chrome://extensions/`.
4.  Enable **Developer Mode**.
5.  Click **Load Unpacked** and select the folder.

---
*Architected by **R H A Ashan Imalka (SCXR)**.*
