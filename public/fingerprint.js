/**
 * Device Fingerprinting Module
 * Generates a persistent, unique device identifier using two layers:
 *
 * Layer 1 — Persistent UUID (localStorage)
 *   A random UUID is generated on first visit and stored in localStorage
 *   as "nysc_device_id". It survives page reloads and browser restarts.
 *   Two identical phones will have different UUIDs, eliminating hash
 *   collisions caused by same-model / same-browser devices.
 *
 * Layer 2 — Hardware signals (canvas, screen, CPU, memory, etc.)
 *   Combined with the UUID in the server-side hash so that even if
 *   localStorage is cleared, the hardware signals still provide a strong
 *   secondary signal.
 */

const DeviceFingerprint = {

  /**
   * Return (or create) the persistent device UUID from localStorage.
   * @returns {string} UUID v4
   */
  getOrCreateDeviceId() {
    const KEY = 'nysc_device_id';
    let id = localStorage.getItem(KEY);
    if (!id) {
      // crypto.randomUUID() is available in all modern browsers
      id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
          });
      localStorage.setItem(KEY, id);
    }
    return id;
  },

  /**
   * Generate canvas fingerprint.
   * Canvas pixel output differs between GPU drivers even on identical
   * phone models, providing strong per-device differentiation.
   * @returns {string}
   */
  getCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return 'unsupported';

      canvas.width = 200;
      canvas.height = 50;
      ctx.textBaseline = 'alphabetic';
      ctx.font = '14px "Arial"';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('NYSC Queue 🇳🇬', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('NYSC Queue 🇳🇬', 4, 17);

      return canvas.toDataURL().substring(0, 150);
    } catch (e) {
      return 'canvas-error';
    }
  },

  /**
   * Get installed browser plugins list.
   * @returns {string}
   */
  getPlugins() {
    if (!navigator.plugins || navigator.plugins.length === 0) return 'none';
    const plugins = [];
    for (let i = 0; i < navigator.plugins.length; i++) {
      plugins.push(navigator.plugins[i].name);
    }
    return plugins.sort().join(',');
  },

  /**
   * Collect all device signals.
   * @returns {Object}
   */
  collect() {
    return {
      deviceId:            this.getOrCreateDeviceId(),
      userAgent:           navigator.userAgent,
      platform:            navigator.platform,
      screenResolution:    `${screen.width}x${screen.height}`,
      screenDepth:         screen.colorDepth,
      timezone:            Intl.DateTimeFormat().resolvedOptions().timeZone,
      language:            navigator.language,
      languages:           navigator.languages ? navigator.languages.join(',') : '',
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      deviceMemory:        navigator.deviceMemory || 0,
      maxTouchPoints:      navigator.maxTouchPoints || 0,
      cookieEnabled:       navigator.cookieEnabled,
      doNotTrack:          navigator.doNotTrack || 'unspecified',
      plugins:             this.getPlugins(),
      canvas:              this.getCanvasFingerprint()
    };
  },

  /**
   * Return device info formatted for the API request.
   * ALL fields that feed into the server-side hash must be top-level here.
   * @returns {Object}
   */
  getDeviceInfo() {
    const info = this.collect();
    return {
      // Primary identifier — persistent UUID
      deviceId:            info.deviceId,

      // Browser / OS signals
      userAgent:           info.userAgent,
      platform:            info.platform,
      screenResolution:    info.screenResolution,
      timezone:            info.timezone,
      language:            info.language,

      // Hardware signals — included in the hash on the server
      canvas:              info.canvas,
      hardwareConcurrency: info.hardwareConcurrency,
      deviceMemory:        info.deviceMemory,
      maxTouchPoints:      info.maxTouchPoints,
      screenDepth:         info.screenDepth,

      // Metadata (not hashed, kept for logging/debug)
      metadata: {
        languages:     info.languages,
        cookieEnabled: info.cookieEnabled,
        doNotTrack:    info.doNotTrack,
        plugins:       info.plugins
      }
    };
  },

  /** Console debug helper */
  debug() {
    const info = this.collect();
    console.log('Device Fingerprint Data:', info);
    return info;
  }
};

window.DeviceFingerprint = DeviceFingerprint;
