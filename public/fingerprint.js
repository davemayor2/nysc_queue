/**
 * Device Fingerprinting Module
 * Collects device characteristics to generate a unique fingerprint
 * This prevents link sharing and device switching
 */

const DeviceFingerprint = {
  /**
   * Collect all device information
   * @returns {Object} Device characteristics
   */
  collect() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      languages: navigator.languages?.join(',') || '',
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      deviceMemory: navigator.deviceMemory || 0,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      plugins: this.getPlugins(),
      canvas: this.getCanvasFingerprint()
    };
  },

  /**
   * Get installed browser plugins
   * @returns {string}
   */
  getPlugins() {
    if (!navigator.plugins || navigator.plugins.length === 0) {
      return 'none';
    }

    const plugins = [];
    for (let i = 0; i < navigator.plugins.length; i++) {
      plugins.push(navigator.plugins[i].name);
    }
    
    return plugins.sort().join(',');
  },

  /**
   * Generate canvas fingerprint
   * Canvas rendering varies slightly between devices
   * @returns {string}
   */
  getCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return 'unsupported';

      // Draw text with specific styling
      canvas.width = 200;
      canvas.height = 50;
      ctx.textBaseline = 'top';
      ctx.font = '14px "Arial"';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('NYSC Queue', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('NYSC Queue', 4, 17);

      // Convert to data URL and hash
      return canvas.toDataURL().substring(0, 100);
    } catch (e) {
      return 'error';
    }
  },

  /**
   * Get formatted device info for API request
   * @returns {Object}
   */
  getDeviceInfo() {
    const info = this.collect();
    
    return {
      userAgent: info.userAgent,
      platform: info.platform,
      screenResolution: info.screenResolution,
      timezone: info.timezone,
      language: info.language,
      // Additional metadata - used for cross-browser device identification
      metadata: {
        colorDepth: info.colorDepth,
        hardwareConcurrency: info.hardwareConcurrency,
        deviceMemory: info.deviceMemory,
        maxTouchPoints: info.maxTouchPoints,
        cookieEnabled: info.cookieEnabled,
        canvas: info.canvas  // Same device = same canvas fingerprint across browsers
      }
    };
  },

  /**
   * Display device info for debugging
   */
  debug() {
    const info = this.collect();
    console.log('Device Fingerprint:', info);
    return info;
  }
};

// Make available globally
window.DeviceFingerprint = DeviceFingerprint;
