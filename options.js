document.addEventListener('DOMContentLoaded', () => {
  // Resolve cross-browser extension API
  const extensionApi = typeof chrome !== 'undefined' && chrome.runtime ? chrome : (typeof browser !== 'undefined' ? browser : null);
  
  if (!extensionApi) {
    console.error('Extension API not detected.');
    return;
  }

  const storage = extensionApi.storage.sync;
  
  // Highlight Color mapping
  const colors = {
    red: { hex: '#ff0000', rgb: '255, 0, 0' },
    blue: { hex: '#0088ff', rgb: '0, 138, 255' },
    green: { hex: '#10b981', rgb: '16, 185, 129' },
    amber: { hex: '#f59e0b', rgb: '245, 158, 11' },
    purple: { hex: '#8b5cf6', rgb: '139, 92, 246' }
  };

  // Helper to convert hex colors to RGB string
  const hexToRgbStr = (hex) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 0, 0';
  };

  // State object
  const state = {
    highlightColor: 'red',
    customColor: '#ff00ff', // default fallback for custom picker
    iconTheme: 'dark',
    scrollBehavior: 'smooth',
    autoLoadAll: false
  };

  // DOM Elements
  const colorBubbles = document.querySelectorAll('.color-bubble');
  const iconThemeRadios = document.querySelectorAll('input[name="iconTheme"]');
  const scrollBehaviorRadios = document.querySelectorAll('input[name="scrollBehavior"]');
  const autoLoadAllCheckbox = document.getElementById('autoLoadAll');

  // Update Toolbar Icon Theme
  const updateToolbarIcon = (theme) => {
    const action = extensionApi.action || extensionApi.browserAction;
    if (!action) {
      console.warn('Action API not supported in this context.');
      return;
    }

    const isLight = theme === 'light';
    const suffix = isLight ? 'light' : 'dark';
    const path = {
      '16': `icons/yt-playlist-icon-${suffix}.png`,
      '32': `icons/yt-playlist-icon-${suffix}.png`,
      '48': `icons/yt-playlist-icon-${suffix}.png`,
      '128': `icons/yt-playlist-icon-${suffix}.png`
    };

    action.setIcon({ path }, () => {
      if (extensionApi.runtime.lastError) {
        console.warn('Failed to set icon dynamically:', extensionApi.runtime.lastError);
      }
    });
  };

  // Update Dynamic CSS variables for local mockup preview
  const updateLocalCSSVariables = (colorName) => {
    let hex, rgb;
    if (colorName === 'custom') {
      hex = state.customColor || '#ff00ff';
      rgb = hexToRgbStr(hex);
    } else {
      const config = colors[colorName] || colors.red;
      hex = config.hex;
      rgb = config.rgb;
    }
    document.documentElement.style.setProperty('--ypt-highlight-color', hex);
    document.documentElement.style.setProperty('--ypt-highlight-rgb', rgb);
  };

  // Apply State to DOM Controls
  const applyStateToDOM = () => {
    // 1. Color bubbles
    colorBubbles.forEach(bubble => {
      if (bubble.dataset.color === state.highlightColor) {
        bubble.classList.add('active');
      } else {
        bubble.classList.remove('active');
      }
    });

    const customInput = document.getElementById('custom-color-input');
    const customBubble = document.querySelector('.custom-color-bubble');
    if (customInput && customBubble) {
      customInput.value = state.customColor;
      if (state.highlightColor === 'custom') {
        customBubble.style.setProperty('--color-val', state.customColor);
        customBubble.style.setProperty('--color-glow', `rgba(${hexToRgbStr(state.customColor)}, 0.4)`);
      } else {
        customBubble.style.setProperty('--color-val', 'linear-gradient(135deg, #ff0055, #00ffcc, #9900ff)');
        customBubble.style.setProperty('--color-glow', 'rgba(255, 255, 255, 0.2)');
      }
    }

    updateLocalCSSVariables(state.highlightColor);

    // 2. Icon theme
    iconThemeRadios.forEach(radio => {
      radio.checked = radio.value === state.iconTheme;
    });

    // 3. Scroll behavior
    scrollBehaviorRadios.forEach(radio => {
      radio.checked = radio.value === state.scrollBehavior;
    });

    // 4. Auto Load
    autoLoadAllCheckbox.checked = state.autoLoadAll;
  };

  // Load Settings from Sync Storage
  const loadSettings = () => {
    storage.get({
      highlightColor: 'red',
      customColor: '#ff00ff',
      iconTheme: 'dark',
      scrollBehavior: 'smooth',
      autoLoadAll: false
    }, (items) => {
      Object.assign(state, items);
      applyStateToDOM();
    });
  };

  // Save Settings to Sync Storage
  const saveSetting = (key, value) => {
    state[key] = value;
    const updateObj = {};
    updateObj[key] = value;

    storage.set(updateObj, () => {
      if (extensionApi.runtime.lastError) {
        console.error('Failed to save settings:', extensionApi.runtime.lastError);
      }
    });
  };

  // Event Listeners: Color picker bubbles
  colorBubbles.forEach(bubble => {
    bubble.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT') return; // Ignore click events rising from custom input

      const selectedColor = e.currentTarget.dataset.color;
      
      // Update Bubble active classes
      colorBubbles.forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');

      // Save setting & update local mockup preview
      saveSetting('highlightColor', selectedColor);
      updateLocalCSSVariables(selectedColor);

      // If switching away from custom, reset custom bubble style
      const customBubble = document.querySelector('.custom-color-bubble');
      if (selectedColor !== 'custom' && customBubble) {
        customBubble.style.setProperty('--color-val', 'linear-gradient(135deg, #ff0055, #00ffcc, #9900ff)');
        customBubble.style.setProperty('--color-glow', 'rgba(255, 255, 255, 0.2)');
      }
    });
  });

  // Event Listeners: Custom color inputs
  const customInput = document.getElementById('custom-color-input');
  const customBubble = document.querySelector('.custom-color-bubble');
  if (customInput && customBubble) {
    customInput.addEventListener('input', (e) => {
      const selectedColor = e.target.value;
      state.customColor = selectedColor;
      
      // Update Bubble styles and activate it
      customBubble.style.setProperty('--color-val', selectedColor);
      customBubble.style.setProperty('--color-glow', `rgba(${hexToRgbStr(selectedColor)}, 0.4)`);
      
      colorBubbles.forEach(b => b.classList.remove('active'));
      customBubble.classList.add('active');

      // Save & Update Preview
      saveSetting('customColor', selectedColor);
      saveSetting('highlightColor', 'custom');
      updateLocalCSSVariables('custom');
    });

    customInput.addEventListener('change', (e) => {
      saveSetting('customColor', e.target.value);
    });
  }

  // Event Listeners: Icon theme radios
  iconThemeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.checked) {
        const value = e.target.value;
        saveSetting('iconTheme', value);
        updateToolbarIcon(value);
      }
    });
  });

  // Event Listeners: Scroll behavior radios
  scrollBehaviorRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.checked) {
        saveSetting('scrollBehavior', e.target.value);
      }
    });
  });

  // Event Listeners: Auto Load Switch
  autoLoadAllCheckbox.addEventListener('change', (e) => {
    saveSetting('autoLoadAll', e.target.checked);
  });

  // 3D Glass Card Tilt Micro-Interaction (Vanilla JS)
  const glassCards = document.querySelectorAll('.glass-card');
  const maxTilt = 4; // Subtle and premium, not disorienting

  glassCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left; // cursor X inside element
      const y = e.clientY - rect.top;  // cursor Y inside element
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      // Calculate rotation relative to card center
      const rotateX = ((centerY - y) / centerY) * maxTilt;
      const rotateY = ((x - centerX) / centerX) * maxTilt;
      
      card.style.transition = 'none'; // Lag-free dynamic mouse follow
      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-6px) scale(1.005)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transition = ''; // Eases smoothly back via CSS transitions
      card.style.transform = '';
    });
  });

  // Dynamic Version Extraction from Manifest
  const manifest = extensionApi.runtime.getManifest();
  const versionElement = document.getElementById('extension-version');
  if (versionElement && manifest && manifest.version) {
    versionElement.textContent = manifest.version;
  }

  // Initial Load
  loadSettings();
});
