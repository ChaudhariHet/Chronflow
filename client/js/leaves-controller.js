/* ============================================================
   Falling Leaves Interactive Controller & UI
   Provides live interactive controls:
   - Pick maple, oak, ginkgo, birch or oval leaves
   - Upload custom images (logo, pet, stickers, anything)
   - Change colors (autumn presets or custom color picker)
   - Change wind direction and speed
   - Change fall speed and leaf count
   - Full persistence in localStorage
   ============================================================ */

(function () {
  const STORAGE_KEY = 'chronflow_falling_leaves_config';

  const COLOR_PRESETS = {
    autumn: {
      name: 'Autumn Glow',
      colors: ['#d9480f', '#e8590c', '#f08c00', '#c92a2a', '#a61e4d', '#b5651d', '#e0a800'],
      preview: 'linear-gradient(135deg, #d9480f, #e0a800)',
    },
    ginkgo: {
      name: 'Golden Ginkgo',
      colors: ['#e0a800', '#f2c12e', '#d99a00', '#c9a227', '#ffd43b'],
      preview: 'linear-gradient(135deg, #e0a800, #ffd43b)',
    },
    emerald: {
      name: 'Forest Emerald',
      colors: ['#2b8a3e', '#40c057', '#2f9e44', '#82c91e', '#12b886'],
      preview: 'linear-gradient(135deg, #2b8a3e, #82c91e)',
    },
    cherry: {
      name: 'Cherry Blossom',
      colors: ['#f06595', '#e64980', '#d6336c', '#ff8787', '#fcc2d7'],
      preview: 'linear-gradient(135deg, #f06595, #ff8787)',
    },
  };

  const DEFAULT_CONFIG = {
    enabled: true,
    shape: 'maple', // 'maple' | 'oak' | 'ginkgo' | 'birch' | 'oval' | 'custom'
    count: 32,
    speed: 1.0, // multiplier
    wind: 0.25, // -1.5 (left) to 1.5 (right)
    colorPreset: 'autumn',
    customColor: '#e8a33d',
    customImageData: null,
    customImageName: '',
  };

  let config = loadConfig();
  let leavesInstance = null;
  let customImageElement = null;

  function loadConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Could not read falling leaves config from localStorage', e);
    }
    return { ...DEFAULT_CONFIG };
  }

  function saveConfig() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn('Could not save falling leaves config to localStorage', e);
    }
  }

  function getActiveColors() {
    if (config.colorPreset === 'custom') {
      return [config.customColor, lightenDarkenColor(config.customColor, 20), lightenDarkenColor(config.customColor, -20)];
    }
    const preset = COLOR_PRESETS[config.colorPreset];
    return preset ? preset.colors : COLOR_PRESETS.autumn.colors;
  }

  function lightenDarkenColor(col, amt) {
    let usePound = false;
    if (col[0] === '#') {
      col = col.slice(1);
      usePound = true;
    }
    if (col.length === 3) {
      col = col[0] + col[0] + col[1] + col[1] + col[2] + col[2];
    }
    const num = parseInt(col, 16);
    let r = (num >> 16) + amt;
    let b = ((num >> 8) & 0x00ff) + amt;
    let g = (num & 0x0000ff) + amt;
    r = Math.min(255, Math.max(0, r));
    b = Math.min(255, Math.max(0, b));
    g = Math.min(255, Math.max(0, g));
    return (usePound ? '#' : '') + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
  }

  function buildLeavesOptions() {
    const baseSpeed = [Math.max(0.2, config.speed * 0.6), config.speed * 1.5];
    const baseWind = [config.wind - 0.45, config.wind + 0.45];

    if (config.shape === 'custom' && customImageElement) {
      return {
        images: [customImageElement],
        count: config.count,
        speed: baseSpeed,
        wind: baseWind,
        size: [24, 42],
        opacity: 0.95,
      };
    }

    return {
      shapes: [config.shape === 'custom' ? 'maple' : config.shape],
      colors: getActiveColors(),
      count: config.count,
      speed: baseSpeed,
      wind: baseWind,
      size: [16, 32],
      opacity: 0.92,
    };
  }

  function initLeaves() {
    if (typeof FallingLeaves === 'undefined') {
      console.warn('FallingLeaves library is not loaded yet.');
      return;
    }

    if (leavesInstance) {
      leavesInstance.destroy();
      leavesInstance = null;
    }

    if (!config.enabled) return;

    if (config.shape === 'custom' && config.customImageData) {
      if (!customImageElement) {
        customImageElement = new Image();
        customImageElement.onload = () => {
          if (config.enabled && !leavesInstance) {
            leavesInstance = new FallingLeaves(buildLeavesOptions());
          }
        };
        customImageElement.src = config.customImageData;
        return;
      }
    }

    leavesInstance = new FallingLeaves(buildLeavesOptions());
  }

  function updateRunningLeaves() {
    if (!config.enabled) {
      if (leavesInstance) {
        leavesInstance.destroy();
        leavesInstance = null;
      }
      return;
    }

    if (!leavesInstance) {
      initLeaves();
      return;
    }

    // If switching custom vs standard shape, re-create for clean canvas sprite reload
    if ((config.shape === 'custom' && !leavesInstance.options.images) ||
        (config.shape !== 'custom' && leavesInstance.options.images)) {
      initLeaves();
      return;
    }

    leavesInstance.update(buildLeavesOptions());
  }

  // --- UI Creation ---
  function injectUI() {
    if (document.getElementById('falling-leaves-container-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'falling-leaves-container-widget';
    widget.innerHTML = `
      <!-- Floating Action Pill Button -->
      <button class="leaves-fab" id="leaves-fab" title="Falling Leaves & Autumn Customizer" aria-label="Falling Leaves settings">
        <span class="leaves-fab-icon">🍂</span>
        <span class="leaves-fab-label">Falling Leaves</span>
        <span class="leaves-fab-status ${config.enabled ? 'active' : 'inactive'}" id="leaves-fab-status">
          ${config.enabled ? 'ON' : 'OFF'}
        </span>
      </button>

      <!-- Interactive Control Panel Modal -->
      <div class="leaves-panel" id="leaves-panel" role="dialog" aria-modal="true" aria-labelledby="leaves-panel-title">
        <div class="leaves-panel-header">
          <div class="leaves-panel-title-group">
            <span class="leaves-panel-icon">🍁</span>
            <div>
              <h3 id="leaves-panel-title">Falling Leaves</h3>
              <p class="leaves-panel-subtitle">Interactive leaf particle effect</p>
            </div>
          </div>
          <button class="leaves-panel-close" id="leaves-panel-close" aria-label="Close panel">✕</button>
        </div>

        <div class="leaves-panel-body">
          <!-- Master Switch -->
          <div class="leaves-setting-row master-row">
            <div>
              <span class="leaves-setting-label">Falling Leaves Effect</span>
              <span class="leaves-setting-desc">Animate across entire window</span>
            </div>
            <label class="leaves-switch">
              <input type="checkbox" id="leaves-master-toggle" ${config.enabled ? 'checked' : ''} />
              <span class="leaves-slider"></span>
            </label>
          </div>

          <div id="leaves-settings-subgroup" class="${config.enabled ? '' : 'is-disabled'}">
            <!-- Leaf Shapes & Custom Image -->
            <div class="leaves-section">
              <span class="leaves-section-title">Leaf Shape & Image</span>
              <div class="leaves-shapes-grid">
                <button type="button" class="shape-btn ${config.shape === 'maple' ? 'active' : ''}" data-shape="maple">
                  <span class="shape-icon">🍁</span>
                  <span class="shape-name">Maple</span>
                </button>
                <button type="button" class="shape-btn ${config.shape === 'oak' ? 'active' : ''}" data-shape="oak">
                  <span class="shape-icon">🍂</span>
                  <span class="shape-name">Oak</span>
                </button>
                <button type="button" class="shape-btn ${config.shape === 'ginkgo' ? 'active' : ''}" data-shape="ginkgo">
                  <span class="shape-icon">🍃</span>
                  <span class="shape-name">Ginkgo</span>
                </button>
                <button type="button" class="shape-btn ${config.shape === 'birch' ? 'active' : ''}" data-shape="birch">
                  <span class="shape-icon">🌿</span>
                  <span class="shape-name">Birch</span>
                </button>
                <button type="button" class="shape-btn ${config.shape === 'oval' ? 'active' : ''}" data-shape="oval">
                  <span class="shape-icon">🍃</span>
                  <span class="shape-name">Oval</span>
                </button>
                <button type="button" class="shape-btn custom-shape-btn ${config.shape === 'custom' ? 'active' : ''}" data-shape="custom">
                  <span class="shape-icon">🖼️</span>
                  <span class="shape-name">Custom</span>
                </button>
              </div>

              <!-- Custom Image Upload Dropzone -->
              <div class="leaves-upload-area ${config.shape === 'custom' ? 'visible' : 'hidden'}" id="leaves-upload-area">
                <input type="file" id="leaves-image-input" accept="image/*" style="display: none;" />
                <div class="upload-dropzone" id="upload-dropzone">
                  ${
                    config.customImageData
                      ? `
                    <div class="custom-image-preview-card">
                      <img src="${config.customImageData}" alt="Custom Leaf" class="custom-image-thumb" />
                      <div class="custom-image-meta">
                        <span class="custom-image-name">${config.customImageName || 'Custom Leaf Image'}</span>
                        <span class="custom-image-tip">Active leaf particle</span>
                      </div>
                      <button type="button" class="btn-remove-custom" id="btn-remove-custom" title="Remove custom image">✕</button>
                    </div>
                  `
                      : `
                    <div class="upload-empty-state">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      <span>Upload your image (logo, pet, anything 🌿)</span>
                      <small>PNG, JPG, SVG, WebP</small>
                    </div>
                  `
                  }
                </div>
              </div>
            </div>

            <!-- Color Palette & Custom Picker -->
            <div class="leaves-section">
              <span class="leaves-section-title">Color Palette</span>
              <div class="leaves-palette-grid">
                ${Object.entries(COLOR_PRESETS)
                  .map(
                    ([key, val]) => `
                  <button type="button" class="palette-btn ${config.colorPreset === key ? 'active' : ''}" data-preset="${key}" title="${val.name}">
                    <span class="palette-swatch" style="background: ${val.preview};"></span>
                    <span class="palette-name">${val.name}</span>
                  </button>
                `
                  )
                  .join('')}
                <button type="button" class="palette-btn custom-color-btn ${config.colorPreset === 'custom' ? 'active' : ''}" data-preset="custom" title="Custom color picker">
                  <input type="color" id="leaves-color-picker" value="${config.customColor}" class="color-picker-input" />
                  <span class="palette-swatch custom-swatch" style="background: ${config.customColor};"></span>
                  <span class="palette-name">Custom</span>
                </button>
              </div>
            </div>

            <!-- Leaf Count Slider -->
            <div class="leaves-section">
              <div class="slider-header">
                <span class="leaves-section-title">Leaves Count</span>
                <span class="slider-val" id="leaves-count-val">${config.count} leaves</span>
              </div>
              <input type="range" class="leaves-slider-input" id="leaves-count-range" min="5" max="80" step="1" value="${config.count}" />
              <div class="slider-ticks">
                <span>Minimal (5)</span>
                <span>Default (30)</span>
                <span>Autumn Storm (80)</span>
              </div>
            </div>

            <!-- Speed Slider -->
            <div class="leaves-section">
              <div class="slider-header">
                <span class="leaves-section-title">Fall Speed</span>
                <span class="slider-val" id="leaves-speed-val">${config.speed.toFixed(1)}x</span>
              </div>
              <input type="range" class="leaves-slider-input" id="leaves-speed-range" min="0.3" max="3.0" step="0.1" value="${config.speed}" />
              <div class="slider-ticks">
                <span>Gentle (0.3x)</span>
                <span>Normal (1.0x)</span>
                <span>Fast (3.0x)</span>
              </div>
            </div>

            <!-- Wind Slider -->
            <div class="leaves-section">
              <div class="slider-header">
                <span class="leaves-section-title">Wind Breeze</span>
                <span class="slider-val" id="leaves-wind-val">
                  ${config.wind < -0.2 ? '← Left breeze' : config.wind > 0.2 ? 'Right breeze →' : 'Calm air'}
                </span>
              </div>
              <input type="range" class="leaves-slider-input" id="leaves-wind-range" min="-1.5" max="1.5" step="0.1" value="${config.wind}" />
              <div class="slider-ticks">
                <span>← Blowing Left</span>
                <span>Calm</span>
                <span>Blowing Right →</span>
              </div>
            </div>
          </div>
        </div>

        <div class="leaves-panel-footer">
          <button type="button" class="btn btn-ghost btn-sm" id="leaves-reset-btn">Reset Defaults</button>
          <button type="button" class="btn btn-primary btn-sm" id="leaves-done-btn">Done</button>
        </div>
      </div>
    `;

    document.body.appendChild(widget);
    bindEvents();
  }

  function bindEvents() {
    const fab = document.getElementById('leaves-fab');
    const panel = document.getElementById('leaves-panel');
    const closeBtn = document.getElementById('leaves-panel-close');
    const doneBtn = document.getElementById('leaves-done-btn');
    const masterToggle = document.getElementById('leaves-master-toggle');
    const resetBtn = document.getElementById('leaves-reset-btn');

    const countRange = document.getElementById('leaves-count-range');
    const countVal = document.getElementById('leaves-count-val');
    const speedRange = document.getElementById('leaves-speed-range');
    const speedVal = document.getElementById('leaves-speed-val');
    const windRange = document.getElementById('leaves-wind-range');
    const windVal = document.getElementById('leaves-wind-val');

    const shapeButtons = document.querySelectorAll('.shape-btn');
    const paletteButtons = document.querySelectorAll('.palette-btn');
    const colorPicker = document.getElementById('leaves-color-picker');

    const dropzone = document.getElementById('upload-dropzone');
    const imageInput = document.getElementById('leaves-image-input');
    const uploadArea = document.getElementById('leaves-upload-area');

    // Toggle Modal
    function openPanel() {
      panel.classList.add('open');
      fab.classList.add('panel-open');
    }
    function closePanel() {
      panel.classList.remove('open');
      fab.classList.remove('panel-open');
    }

    fab.addEventListener('click', () => {
      if (panel.classList.contains('open')) closePanel();
      else openPanel();
    });

    closeBtn.addEventListener('click', closePanel);
    doneBtn.addEventListener('click', closePanel);

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (panel.classList.contains('open') && !panel.contains(e.target) && !fab.contains(e.target)) {
        closePanel();
      }
    });

    // Master Switch
    masterToggle.addEventListener('change', (e) => {
      config.enabled = e.target.checked;
      const statusPill = document.getElementById('leaves-fab-status');
      const subgroup = document.getElementById('leaves-settings-subgroup');
      if (config.enabled) {
        statusPill.textContent = 'ON';
        statusPill.className = 'leaves-fab-status active';
        subgroup.classList.remove('is-disabled');
      } else {
        statusPill.textContent = 'OFF';
        statusPill.className = 'leaves-fab-status inactive';
        subgroup.classList.add('is-disabled');
      }
      saveConfig();
      updateRunningLeaves();
    });

    // Shape Selection
    shapeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        shapeButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const shape = btn.getAttribute('data-shape');
        config.shape = shape;

        if (shape === 'custom') {
          uploadArea.classList.remove('hidden');
          uploadArea.classList.add('visible');
          if (!config.customImageData && imageInput) {
            imageInput.click();
          }
        } else {
          uploadArea.classList.remove('visible');
          uploadArea.classList.add('hidden');
        }

        saveConfig();
        updateRunningLeaves();
      });
    });

    // Custom Image Handling
    if (dropzone && imageInput) {
      dropzone.addEventListener('click', (e) => {
        if (e.target.closest('#btn-remove-custom')) return;
        imageInput.click();
      });

      imageInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        processImageFile(file);
      });

      // Drag and Drop
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          processImageFile(e.dataTransfer.files[0]);
        }
      });
    }

    function processImageFile(file) {
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file (PNG, JPG, SVG, WebP).');
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target.result;
        config.customImageData = dataUrl;
        config.customImageName = file.name;
        config.shape = 'custom';

        customImageElement = new Image();
        customImageElement.onload = () => {
          saveConfig();
          renderCustomPreview();
          updateRunningLeaves();
        };
        customImageElement.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }

    function renderCustomPreview() {
      if (!dropzone) return;
      if (config.customImageData) {
        dropzone.innerHTML = `
          <div class="custom-image-preview-card">
            <img src="${config.customImageData}" alt="Custom Leaf" class="custom-image-thumb" />
            <div class="custom-image-meta">
              <span class="custom-image-name">${config.customImageName || 'Custom Leaf Image'}</span>
              <span class="custom-image-tip">Active leaf particle</span>
            </div>
            <button type="button" class="btn-remove-custom" id="btn-remove-custom" title="Remove custom image">✕</button>
          </div>
        `;
        const removeBtn = document.getElementById('btn-remove-custom');
        if (removeBtn) {
          removeBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            config.customImageData = null;
            config.customImageName = '';
            config.shape = 'maple';
            customImageElement = null;

            shapeButtons.forEach((b) => {
              b.classList.toggle('active', b.getAttribute('data-shape') === 'maple');
            });
            uploadArea.classList.remove('visible');
            uploadArea.classList.add('hidden');

            renderCustomPreview();
            saveConfig();
            updateRunningLeaves();
          });
        }
      } else {
        dropzone.innerHTML = `
          <div class="upload-empty-state">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span>Upload your image (logo, pet, anything 🌿)</span>
            <small>PNG, JPG, SVG, WebP</small>
          </div>
        `;
      }
    }

    // Attach initial remove button listener if custom image exists
    const initialRemove = document.getElementById('btn-remove-custom');
    if (initialRemove) {
      initialRemove.addEventListener('click', (ev) => {
        ev.stopPropagation();
        config.customImageData = null;
        config.customImageName = '';
        config.shape = 'maple';
        customImageElement = null;

        shapeButtons.forEach((b) => {
          b.classList.toggle('active', b.getAttribute('data-shape') === 'maple');
        });
        uploadArea.classList.remove('visible');
        uploadArea.classList.add('hidden');

        renderCustomPreview();
        saveConfig();
        updateRunningLeaves();
      });
    }

    // Palette Selection
    paletteButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        if (e.target === colorPicker) return;
        paletteButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const preset = btn.getAttribute('data-preset');
        config.colorPreset = preset;

        saveConfig();
        updateRunningLeaves();
      });
    });

    // Custom Color Picker
    if (colorPicker) {
      colorPicker.addEventListener('input', (e) => {
        config.customColor = e.target.value;
        config.colorPreset = 'custom';

        paletteButtons.forEach((b) => {
          b.classList.toggle('active', b.getAttribute('data-preset') === 'custom');
        });
        const swatch = document.querySelector('.custom-swatch');
        if (swatch) swatch.style.background = config.customColor;

        saveConfig();
        updateRunningLeaves();
      });
    }

    // Sliders
    countRange.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      config.count = val;
      countVal.textContent = `${val} leaves`;
      saveConfig();
      updateRunningLeaves();
    });

    speedRange.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      config.speed = val;
      speedVal.textContent = `${val.toFixed(1)}x`;
      saveConfig();
      updateRunningLeaves();
    });

    windRange.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      config.wind = val;
      windVal.textContent = val < -0.2 ? '← Left breeze' : val > 0.2 ? 'Right breeze →' : 'Calm air';
      saveConfig();
      updateRunningLeaves();
    });

    // Reset Defaults
    resetBtn.addEventListener('click', () => {
      config = { ...DEFAULT_CONFIG };
      customImageElement = null;
      saveConfig();

      // Refresh UI values
      masterToggle.checked = config.enabled;
      document.getElementById('leaves-fab-status').textContent = 'ON';
      document.getElementById('leaves-fab-status').className = 'leaves-fab-status active';
      document.getElementById('leaves-settings-subgroup').classList.remove('is-disabled');

      shapeButtons.forEach((b) => {
        b.classList.toggle('active', b.getAttribute('data-shape') === config.shape);
      });
      uploadArea.classList.remove('visible');
      uploadArea.classList.add('hidden');
      renderCustomPreview();

      paletteButtons.forEach((b) => {
        b.classList.toggle('active', b.getAttribute('data-preset') === config.colorPreset);
      });

      countRange.value = config.count;
      countVal.textContent = `${config.count} leaves`;

      speedRange.value = config.speed;
      speedVal.textContent = `${config.speed.toFixed(1)}x`;

      windRange.value = config.wind;
      windVal.textContent = 'Calm air';

      updateRunningLeaves();
    });
  }

  // --- Auto-start on DOM ready ---
  function init() {
    initLeaves();
    injectUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
