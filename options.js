document.addEventListener('DOMContentLoaded', () => {
  // Resolve cross-browser extension API
  const extensionApi = typeof chrome !== 'undefined' && chrome.runtime ? chrome : (typeof browser !== 'undefined' ? browser : null);

  if (!extensionApi) {
    console.error('Extension API not detected.');
    return;
  }

  const storage = extensionApi.storage.sync;

  // State object (defaults shared with the content script via common.js)
  const state = { ...YPT_DEFAULT_SETTINGS };

  // DOM Elements
  const colorBubbles = document.querySelectorAll('.color-bubble');
  const iconThemeRadios = document.querySelectorAll('input[name="iconTheme"]');
  const scrollBehaviorRadios = document.querySelectorAll('input[name="scrollBehavior"]');
  const autoLoadAllCheckbox = document.getElementById('autoLoadAll');
  const customInput = document.getElementById('custom-color-input');
  const customBubble = document.querySelector('.custom-color-bubble');

  // Style the custom bubble: a concrete color when active, rainbow placeholder otherwise
  const setCustomBubbleAppearance = (color) => {
    if (!customBubble) return;
    if (color) {
      customBubble.style.setProperty('--color-val', color);
      customBubble.style.setProperty('--color-glow', `rgba(${yptHexToRgbStr(color)}, 0.4)`);
    } else {
      customBubble.style.setProperty('--color-val', 'linear-gradient(135deg, #ff0055, #00ffcc, #9900ff)');
      customBubble.style.setProperty('--color-glow', 'rgba(255, 255, 255, 0.2)');
    }
  };

  // Update Dynamic CSS variables for local mockup preview
  const updateLocalCSSVariables = (colorName) => {
    const hex = colorName === 'custom'
      ? (state.customColor || YPT_DEFAULT_SETTINGS.customColor)
      : (YPT_COLORS[colorName] || YPT_COLORS.red);
    document.documentElement.style.setProperty('--ypt-highlight-color', hex);
    document.documentElement.style.setProperty('--ypt-highlight-rgb', yptHexToRgbStr(hex));
  };

  // Apply State to DOM Controls
  const applyStateToDOM = () => {
    // 1. Color bubbles
    colorBubbles.forEach(bubble => {
      bubble.classList.toggle('active', bubble.dataset.color === state.highlightColor);
    });

    if (customInput) {
      customInput.value = state.customColor;
    }
    setCustomBubbleAppearance(state.highlightColor === 'custom' ? state.customColor : null);

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
    storage.get({ ...YPT_DEFAULT_SETTINGS }, (items) => {
      Object.assign(state, items);
      applyStateToDOM();
    });
  };

  // Save Settings to Sync Storage
  const saveSetting = (key, value) => {
    state[key] = value;

    storage.set({ [key]: value }, () => {
      if (extensionApi.runtime.lastError) {
        console.error('Failed to save settings:', extensionApi.runtime.lastError);
      }
    });
  };

  // Event Listeners: Color picker bubbles
  colorBubbles.forEach(bubble => {
    bubble.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT') return; // Ignore click events rising from custom input

      saveSetting('highlightColor', e.currentTarget.dataset.color);
      applyStateToDOM();
    });
  });

  // Event Listeners: Custom color inputs
  if (customInput && customBubble) {
    customInput.addEventListener('input', (e) => {
      saveSetting('customColor', e.target.value);
      saveSetting('highlightColor', 'custom');
      applyStateToDOM();
    });

    customInput.addEventListener('change', (e) => {
      saveSetting('customColor', e.target.value);
    });
  }

  // Event Listeners: Icon theme radios (the background script watches this
  // setting and applies the toolbar icon, including after browser restarts)
  iconThemeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.checked) {
        saveSetting('iconTheme', e.target.value);
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
