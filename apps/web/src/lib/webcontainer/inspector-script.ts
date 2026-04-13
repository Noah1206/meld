/**
 * Meld Visual Editor — injected into preview iframe
 *
 * Modes:
 * - Hover: blue overlay
 * - Click: select element (Figma-style)
 * - Double-click text: inline edit → AI updates code
 * - Right-click: context menu (change color, spacing, etc.)
 * - Drag spacing handles: visual padding/margin adjustment
 */
export const INSPECTOR_SCRIPT = `
(function() {
  'use strict';
  if (window.__meldInspectorLoaded) return;
  window.__meldInspectorLoaded = true;

  let inspectorEnabled = false;
  let currentTarget = null;
  let selectedTarget = null;
  let editingText = false;

  // --- Hover Overlay ---
  let hoverOverlay = null;
  function getHoverOverlay() {
    if (hoverOverlay) return hoverOverlay;
    const el = document.createElement('div');
    el.id = '__meld-hover-overlay';
    el.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483640;border:1.5px solid #3B82F6;background:rgba(59,130,246,0.06);border-radius:2px;transition:all 0.08s ease-out;display:none';
    document.body.appendChild(el);
    hoverOverlay = el;
    return el;
  }

  function positionHover(target) {
    const ov = getHoverOverlay();
    if (!target || target === selectedTarget) { ov.style.display = 'none'; return; }
    const r = target.getBoundingClientRect();
    ov.style.display = 'block';
    ov.style.top = r.top + 'px'; ov.style.left = r.left + 'px';
    ov.style.width = r.width + 'px'; ov.style.height = r.height + 'px';
  }

  // --- Selection Box ---
  let selectionBox = null;
  let selectionLabel = null;
  const handles = [];
  const HANDLE_SIZE = 8;

  function getSelectionBox() {
    if (selectionBox) return selectionBox;
    const el = document.createElement('div');
    el.id = '__meld-selection-box';
    el.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483645;border:1.5px solid #000;display:none';
    document.body.appendChild(el);
    selectionBox = el;

    const half = HANDLE_SIZE / 2;
    [
      { top: -half + 'px', left: -half + 'px' },
      { top: -half + 'px', right: -half + 'px' },
      { bottom: -half + 'px', left: -half + 'px' },
      { bottom: -half + 'px', right: -half + 'px' },
    ].forEach(function(pos) {
      const h = document.createElement('div');
      h.style.cssText = 'position:absolute;width:' + HANDLE_SIZE + 'px;height:' + HANDLE_SIZE + 'px;background:#000;border:1px solid #fff;pointer-events:none';
      Object.assign(h.style, pos);
      el.appendChild(h);
      handles.push(h);
    });
    return el;
  }

  function getSelectionLabel() {
    if (selectionLabel) return selectionLabel;
    const el = document.createElement('div');
    el.id = '__meld-selection-label';
    el.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;display:none;align-items:center;gap:4px;background:#000;color:#fff;font-size:11px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:3px 8px;border-radius:4px;white-space:nowrap';
    el.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg><span></span>';
    document.body.appendChild(el);
    selectionLabel = el;
    return el;
  }

  function positionSelection(target) {
    const box = getSelectionBox();
    const label = getSelectionLabel();
    if (!target) { box.style.display = 'none'; label.style.display = 'none'; hideSpacingHandles(); return; }
    const r = target.getBoundingClientRect();
    box.style.display = 'block';
    box.style.top = r.top + 'px'; box.style.left = r.left + 'px';
    box.style.width = r.width + 'px'; box.style.height = r.height + 'px';

    const name = getReactComponentName(target) || target.tagName.toLowerCase();
    label.querySelector('span').textContent = name;
    label.style.display = 'inline-flex';
    label.style.left = r.left + 'px';
    label.style.top = Math.max(0, r.top - 26) + 'px';

    showSpacingHandles(target);
  }

  // --- Spacing Handles (visual padding/margin) ---
  let spacingOverlay = null;
  let spacingLabels = {};
  let activeSpacingDrag = null;

  function getSpacingOverlay() {
    if (spacingOverlay) return spacingOverlay;
    const el = document.createElement('div');
    el.id = '__meld-spacing-overlay';
    el.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483643;display:none';
    document.body.appendChild(el);
    spacingOverlay = el;

    // Padding zones (green)
    ['top','right','bottom','left'].forEach(function(side) {
      const zone = document.createElement('div');
      zone.dataset.side = side;
      zone.dataset.type = 'padding';
      zone.style.cssText = 'position:fixed;background:rgba(34,197,94,0.15);pointer-events:auto;cursor:' + (side === 'top' || side === 'bottom' ? 'ns-resize' : 'ew-resize') + ';z-index:2147483644';
      el.appendChild(zone);

      const lbl = document.createElement('div');
      lbl.style.cssText = 'position:absolute;background:rgba(34,197,94,0.9);color:#fff;font-size:9px;font-family:monospace;padding:1px 4px;border-radius:2px;pointer-events:none;white-space:nowrap';
      zone.appendChild(lbl);
      spacingLabels['padding-' + side] = { zone: zone, label: lbl };
    });

    return el;
  }

  function showSpacingHandles(target) {
    const ov = getSpacingOverlay();
    ov.style.display = 'block';
    const cs = window.getComputedStyle(target);
    const r = target.getBoundingClientRect();

    const pt = parseFloat(cs.paddingTop) || 0;
    const pr = parseFloat(cs.paddingRight) || 0;
    const pb = parseFloat(cs.paddingBottom) || 0;
    const pl = parseFloat(cs.paddingLeft) || 0;

    // Position padding zones
    var zones = {
      top:    { top: r.top, left: r.left + pl, width: r.width - pl - pr, height: pt },
      bottom: { top: r.bottom - pb, left: r.left + pl, width: r.width - pl - pr, height: pb },
      left:   { top: r.top + pt, left: r.left, width: pl, height: r.height - pt - pb },
      right:  { top: r.top + pt, left: r.right - pr, width: pr, height: r.height - pt - pb },
    };

    ['top','right','bottom','left'].forEach(function(side) {
      var z = zones[side];
      var item = spacingLabels['padding-' + side];
      if (z.width < 2 && z.height < 2) {
        item.zone.style.display = 'none';
        return;
      }
      item.zone.style.display = 'block';
      item.zone.style.top = z.top + 'px';
      item.zone.style.left = z.left + 'px';
      item.zone.style.width = Math.max(4, z.width) + 'px';
      item.zone.style.height = Math.max(4, z.height) + 'px';

      var val = Math.round(side === 'top' ? pt : side === 'bottom' ? pb : side === 'left' ? pl : pr);
      item.label.textContent = val + 'px';
      // Center label
      if (side === 'top' || side === 'bottom') {
        item.label.style.left = '50%'; item.label.style.transform = 'translateX(-50%)';
        item.label.style.top = side === 'top' ? '0' : ''; item.label.style.bottom = side === 'bottom' ? '0' : '';
      } else {
        item.label.style.top = '50%'; item.label.style.transform = 'translateY(-50%)';
        item.label.style.left = side === 'left' ? '0' : ''; item.label.style.right = side === 'right' ? '0' : '';
      }
    });
  }

  function hideSpacingHandles() {
    if (spacingOverlay) spacingOverlay.style.display = 'none';
  }

  // Spacing drag handler
  function handleSpacingDrag(e) {
    var zone = e.target;
    if (!zone.dataset || !zone.dataset.side || !selectedTarget) return;

    e.preventDefault();
    e.stopPropagation();

    var side = zone.dataset.side;
    var startPos = (side === 'top' || side === 'bottom') ? e.clientY : e.clientX;
    var cs = window.getComputedStyle(selectedTarget);
    var propName = 'padding' + side.charAt(0).toUpperCase() + side.slice(1);
    var startVal = parseFloat(cs[propName]) || 0;

    activeSpacingDrag = { side: side, startPos: startPos, startVal: startVal };

    function onMove(ev) {
      if (!activeSpacingDrag) return;
      var diff = (side === 'top' || side === 'bottom')
        ? (side === 'bottom' ? ev.clientY - startPos : startPos - ev.clientY)
        : (side === 'right' ? ev.clientX - startPos : startPos - ev.clientX);
      var newVal = Math.max(0, Math.round(startVal + diff));
      selectedTarget.style[propName] = newVal + 'px';
      positionSelection(selectedTarget);
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);

      if (activeSpacingDrag && selectedTarget) {
        var finalVal = parseFloat(selectedTarget.style[propName]) || 0;
        // Send change to parent
        window.parent.postMessage({
          type: 'meld:visual-edit',
          payload: {
            editType: 'spacing',
            property: 'padding-' + side,
            value: Math.round(finalVal) + 'px',
            element: collectElementInfo(selectedTarget),
          }
        }, '*');
      }
      activeSpacingDrag = null;
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // --- Context Menu ---
  let contextMenu = null;

  function getContextMenu() {
    if (contextMenu) return contextMenu;
    const el = document.createElement('div');
    el.id = '__meld-context-menu';
    el.style.cssText = 'position:fixed;z-index:2147483647;display:none;background:#1A1A1A;border-radius:12px;padding:4px;min-width:180px;box-shadow:0 8px 30px rgba(0,0,0,0.3);font-family:-apple-system,BlinkMacSystemFont,sans-serif';
    document.body.appendChild(el);
    contextMenu = el;
    return el;
  }

  // --- Inline Sub-Panel Builders ---

  function buildSliderPanel(title, min, max, step, currentVal, unit, onUpdate, onCommit) {
    var panel = document.createElement('div');
    panel.style.cssText = 'padding:8px 12px;border-top:1px solid rgba(255,255,255,0.06)';
    panel.innerHTML = '<div style="font-size:10px;color:#888;margin-bottom:6px;font-family:-apple-system,sans-serif">' + title + '</div>'
      + '<div style="display:flex;align-items:center;gap:8px">'
      + '<input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + currentVal + '" style="flex:1;accent-color:#3B82F6;height:4px;cursor:pointer">'
      + '<input type="number" min="' + min + '" max="' + max + '" step="' + step + '" value="' + currentVal + '" style="width:52px;background:#111;border:1px solid rgba(255,255,255,0.12);border-radius:6px;color:#fff;font-size:12px;font-family:monospace;padding:4px 6px;text-align:right;outline:none">'
      + '<span style="font-size:11px;color:#666;min-width:18px">' + unit + '</span>'
      + '</div>';

    var range = panel.querySelector('input[type=range]');
    var num = panel.querySelector('input[type=number]');

    range.addEventListener('input', function() {
      num.value = range.value;
      onUpdate(parseFloat(range.value));
    });
    range.addEventListener('change', function() {
      onCommit(parseFloat(range.value));
    });
    num.addEventListener('input', function() {
      var v = Math.max(min, Math.min(max, parseFloat(num.value) || min));
      range.value = v;
      onUpdate(v);
    });
    num.addEventListener('change', function() {
      var v = Math.max(min, Math.min(max, parseFloat(num.value) || min));
      onCommit(v);
    });

    return panel;
  }

  function buildShadowPresetPanel(currentShadow, onSelect) {
    var panel = document.createElement('div');
    panel.style.cssText = 'padding:8px 12px;border-top:1px solid rgba(255,255,255,0.06)';
    panel.innerHTML = '<div style="font-size:10px;color:#888;margin-bottom:6px;font-family:-apple-system,sans-serif">Box Shadow</div>';

    var presets = [
      { label: 'none', value: 'none' },
      { label: 'sm', value: '0 1px 2px 0 rgba(0,0,0,0.05)' },
      { label: 'md', value: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)' },
      { label: 'lg', value: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)' },
      { label: 'xl', value: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' },
    ];

    var grid = document.createElement('div');
    grid.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap';

    presets.forEach(function(p) {
      var isActive = (currentShadow === 'none' && p.label === 'none') || (currentShadow && currentShadow.indexOf(p.value.slice(0, 10)) !== -1);
      var btn = document.createElement('div');
      btn.style.cssText = 'padding:4px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-family:monospace;color:#ccc;background:' + (isActive ? 'rgba(59,130,246,0.25)' : '#111') + ';border:1px solid ' + (isActive ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.1)') + ';transition:all 0.15s';
      btn.textContent = p.label;
      btn.onmouseenter = function() { btn.style.borderColor = 'rgba(59,130,246,0.5)'; };
      btn.onmouseleave = function() { if (!isActive) btn.style.borderColor = 'rgba(255,255,255,0.1)'; };
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        onSelect(p.value, p.label);
      });
      grid.appendChild(btn);
    });

    panel.appendChild(grid);
    return panel;
  }

  // Track open sub-panels so we can close them
  var activeSubPanel = null;
  function closeSubPanel() {
    if (activeSubPanel) { activeSubPanel.remove(); activeSubPanel = null; }
  }

  function showContextMenu(x, y, target) {
    const menu = getContextMenu();
    const cs = window.getComputedStyle(target);
    const hasText = target.childNodes.length > 0 && Array.from(target.childNodes).some(function(n) { return n.nodeType === 3 && n.textContent.trim(); });
    const bgColor = cs.backgroundColor;
    const textColor = cs.color;
    const curFontSize = parseFloat(cs.fontSize) || 16;
    const curOpacity = Math.round((parseFloat(cs.opacity) || 1) * 100);
    const curGap = parseFloat(cs.gap) || 0;
    const curShadow = cs.boxShadow || 'none';
    const isFlex = cs.display === 'flex' || cs.display === 'inline-flex' || cs.display === 'grid' || cs.display === 'inline-grid';

    var items = [];

    if (hasText) {
      items.push({ label: 'Edit text', icon: 'T', action: 'editText' });
    }
    items.push({ label: 'Change color', icon: '', swatch: textColor, action: 'changeColor', prop: 'color' });
    items.push({ label: 'Change background', icon: '', swatch: bgColor, action: 'changeColor', prop: 'backgroundColor' });
    items.push({ type: 'divider' });
    items.push({ label: 'Change font size', icon: 'Aa', action: 'changeFontSize', detail: Math.round(curFontSize) + 'px' });
    items.push({ label: 'Change opacity', icon: '\\u25CF', action: 'changeOpacity', detail: curOpacity + '%' });
    if (isFlex) {
      items.push({ label: 'Change gap', icon: '\\u2194', action: 'changeGap', detail: Math.round(curGap) + 'px' });
    }
    items.push({ label: 'Change shadow', icon: '\\u25A3', action: 'changeShadow', detail: curShadow === 'none' ? 'none' : '...' });
    items.push({ type: 'divider' });
    items.push({ label: 'Copy styles', icon: '\\u2398', action: 'copyStyles' });
    items.push({ label: 'Ask AI to edit', icon: '\\u2728', action: 'askAi' });

    menu.innerHTML = items.map(function(item) {
      if (item.type === 'divider') return '<div style="height:1px;background:rgba(255,255,255,0.08);margin:4px 8px"></div>';
      var swatchHtml = item.swatch ? '<div style="width:14px;height:14px;border-radius:4px;background:' + item.swatch + ';border:1px solid rgba(255,255,255,0.15)"></div>' : '<span style="font-size:12px;width:14px;text-align:center">' + (item.icon || '') + '</span>';
      var detailHtml = item.detail ? '<span style="margin-left:auto;font-size:11px;color:#666;font-family:monospace">' + item.detail + '</span>' : '';
      return '<div data-action="' + item.action + '" data-prop="' + (item.prop || '') + '" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;cursor:pointer;color:#fff;font-size:13px;transition:background 0.1s" onmouseenter="this.style.background=\\'rgba(255,255,255,0.08)\\'" onmouseleave="this.style.background=\\'transparent\\'">' + swatchHtml + item.label + detailHtml + '</div>';
    }).join('');

    // Append sub-panel container
    var subContainer = document.createElement('div');
    subContainer.id = '__meld-ctx-sub';
    menu.appendChild(subContainer);

    menu.style.display = 'block';
    menu.style.left = Math.min(x, window.innerWidth - 220) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - 350) + 'px';
  }

  function hideContextMenu() {
    closeSubPanel();
    if (contextMenu) contextMenu.style.display = 'none';
  }

  // --- Color Picker ---
  let colorPicker = null;

  function showColorPicker(target, property) {
    if (colorPicker) colorPicker.remove();

    const cs = window.getComputedStyle(target);
    const currentColor = cs[property];
    const r = target.getBoundingClientRect();

    const el = document.createElement('div');
    el.id = '__meld-color-picker';
    el.style.cssText = 'position:fixed;z-index:2147483647;background:#1A1A1A;border-radius:12px;padding:12px;box-shadow:0 8px 30px rgba(0,0,0,0.4)';
    el.style.left = Math.min(r.right + 8, window.innerWidth - 220) + 'px';
    el.style.top = r.top + 'px';

    var presets = ['#000000','#FFFFFF','#EF4444','#F97316','#EAB308','#22C55E','#3B82F6','#8B5CF6','#EC4899','#6B7280','#1A1A1A','#F7F7F5'];

    el.innerHTML = '<div style="margin-bottom:8px;font-size:11px;color:#888;font-family:-apple-system,sans-serif">' + (property === 'color' ? 'Text Color' : 'Background') + '</div>'
      + '<input type="color" value="' + rgbToHex(currentColor) + '" style="width:100%;height:36px;border:none;border-radius:8px;cursor:pointer;background:transparent">'
      + '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin-top:8px">'
      + presets.map(function(c) { return '<div data-color="' + c + '" style="width:28px;height:28px;border-radius:6px;cursor:pointer;background:' + c + ';border:1px solid rgba(255,255,255,0.1);transition:transform 0.1s" onmouseenter="this.style.transform=\\'scale(1.15)\\'" onmouseleave="this.style.transform=\\'scale(1)\\'"></div>'; }).join('')
      + '</div>';

    document.body.appendChild(el);
    colorPicker = el;

    var input = el.querySelector('input[type=color]');
    input.addEventListener('input', function() {
      target.style[property] = input.value;
    });
    input.addEventListener('change', function() {
      sendColorChange(target, property, input.value);
    });

    el.querySelectorAll('[data-color]').forEach(function(swatch) {
      swatch.addEventListener('click', function() {
        var color = swatch.dataset.color;
        target.style[property] = color;
        input.value = color;
        sendColorChange(target, property, color);
      });
    });
  }

  function sendColorChange(target, property, value) {
    window.parent.postMessage({
      type: 'meld:visual-edit',
      payload: {
        editType: 'color',
        property: property === 'backgroundColor' ? 'background-color' : property,
        value: value,
        element: collectElementInfo(target),
      }
    }, '*');
    hideColorPicker();
  }

  function hideColorPicker() {
    if (colorPicker) { colorPicker.remove(); colorPicker = null; }
  }

  function rgbToHex(rgb) {
    if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return '#FFFFFF';
    if (rgb.startsWith('#')) return rgb;
    var match = rgb.match(/\\d+/g);
    if (!match || match.length < 3) return '#000000';
    return '#' + match.slice(0, 3).map(function(x) { return parseInt(x).toString(16).padStart(2, '0'); }).join('');
  }

  // --- Inline Text Editing ---
  function startTextEdit(target) {
    if (editingText) return;
    editingText = true;

    var originalText = target.textContent;
    target.contentEditable = 'true';
    target.style.outline = '2px solid #3B82F6';
    target.style.outlineOffset = '2px';
    target.style.borderRadius = '2px';
    target.focus();

    // Select all text
    var range = document.createRange();
    range.selectNodeContents(target);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    // Hide selection overlay while editing
    positionSelection(null);

    function finishEdit() {
      target.contentEditable = 'false';
      target.style.outline = '';
      target.style.outlineOffset = '';
      editingText = false;

      var newText = target.textContent.trim();
      if (newText !== originalText.trim()) {
        window.parent.postMessage({
          type: 'meld:visual-edit',
          payload: {
            editType: 'text',
            oldText: originalText.trim(),
            newText: newText,
            element: collectElementInfo(target),
          }
        }, '*');
      }

      selectedTarget = target;
      positionSelection(target);
    }

    target.addEventListener('blur', finishEdit, { once: true });
    target.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        target.blur();
      }
      if (e.key === 'Escape') {
        target.textContent = originalText;
        target.blur();
      }
    });
  }

  // --- React Fiber helpers ---
  function getReactComponentName(el) {
    var keys = Object.keys(el);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].startsWith('__reactFiber$') || keys[i].startsWith('__reactInternalInstance$')) {
        var fiber = el[keys[i]];
        while (fiber) {
          if (fiber.type && typeof fiber.type === 'function') {
            var n = fiber.type.displayName || fiber.type.name;
            if (n && /^[A-Z]/.test(n)) return n;
          }
          if (fiber.type && typeof fiber.type === 'object' && fiber.type.$$typeof) {
            var inner = fiber.type.render || fiber.type.type;
            if (inner) { var n2 = inner.displayName || inner.name; if (n2 && /^[A-Z]/.test(n2)) return n2; }
          }
          fiber = fiber.return;
        }
        break;
      }
    }
    return null;
  }

  function getReactSource(el) {
    var keys = Object.keys(el);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].startsWith('__reactFiber$') || keys[i].startsWith('__reactInternalInstance$')) {
        var fiber = el[keys[i]];
        while (fiber) {
          if (fiber._debugSource) {
            var s = fiber._debugSource;
            return (s.fileName || '') + ':' + (s.lineNumber || 0) + ':' + (s.columnNumber || 0);
          }
          fiber = fiber.return;
        }
        break;
      }
    }
    return null;
  }

  function buildSelector(el) {
    if (el.id) return '#' + el.id;
    var parts = [];
    var node = el;
    while (node && node !== document.body && parts.length < 5) {
      var s = node.tagName.toLowerCase();
      if (node.id) { parts.unshift('#' + node.id); break; }
      if (node.className && typeof node.className === 'string') {
        var cls = node.className.trim().split(/\\s+/).slice(0, 2).join('.');
        if (cls) s += '.' + cls;
      }
      parts.unshift(s);
      node = node.parentElement;
    }
    return parts.join(' > ');
  }

  var STYLE_KEYS = [
    'display','position','width','height','padding','margin',
    'paddingTop','paddingRight','paddingBottom','paddingLeft',
    'marginTop','marginRight','marginBottom','marginLeft',
    'backgroundColor','color','fontSize','fontFamily','fontWeight','lineHeight','letterSpacing',
    'borderRadius','border','borderWidth','borderColor','borderStyle',
    'gap','flexDirection','justifyContent',
    'alignItems','overflow','opacity','zIndex','boxShadow',
    'maxWidth','minWidth','maxHeight','minHeight','textAlign','gridTemplateColumns',
  ];

  function getComputedStyles(el) {
    try {
      var cs = window.getComputedStyle(el);
      var result = {};
      for (var i = 0; i < STYLE_KEYS.length; i++) {
        var key = STYLE_KEYS[i];
        var val = cs.getPropertyValue(key.replace(/[A-Z]/g, function(m) { return '-' + m.toLowerCase(); }));
        if (val) {
          result[key] = val;
        }
      }
      return result;
    } catch(e) { return null; }
  }

  function collectElementInfo(el) {
    var rect = el.getBoundingClientRect();
    return {
      tagName: el.tagName.toLowerCase(),
      className: typeof el.className === 'string' ? el.className : '',
      id: el.id || '',
      textContent: (el.textContent || '').trim().slice(0, 100),
      componentName: getReactComponentName(el),
      selector: buildSelector(el),
      rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
      sourceLoc: getReactSource(el),
      computedStyle: getComputedStyles(el),
    };
  }

  // --- Drag to Move ---
  let dragState = null;

  function startDrag(e) {
    if (!inspectorEnabled || !selectedTarget || editingText) return;
    if (isMeldElement(e.target)) return;
    if (e.target !== selectedTarget && !selectedTarget.contains(e.target)) return;
    if (e.button !== 0) return;

    // Don't drag if on spacing zone or resize handle
    if (e.target.dataset && (e.target.dataset.side || e.target.dataset.resize)) return;

    e.preventDefault();
    e.stopPropagation();

    var cs = window.getComputedStyle(selectedTarget);
    var pos = cs.position;
    if (pos === 'static') {
      selectedTarget.style.position = 'relative';
      pos = 'relative';
    }

    dragState = {
      startX: e.clientX,
      startY: e.clientY,
      origLeft: parseFloat(cs.left) || 0,
      origTop: parseFloat(cs.top) || 0,
      target: selectedTarget,
    };

    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
  }

  function onDragMove(e) {
    if (!dragState) return;
    var dx = e.clientX - dragState.startX;
    var dy = e.clientY - dragState.startY;
    dragState.target.style.left = Math.round(dragState.origLeft + dx) + 'px';
    dragState.target.style.top = Math.round(dragState.origTop + dy) + 'px';
    positionSelection(dragState.target);
  }

  function onDragEnd() {
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);

    if (dragState && dragState.target) {
      var cs = window.getComputedStyle(dragState.target);
      window.parent.postMessage({
        type: 'meld:visual-edit',
        payload: {
          editType: 'position',
          property: 'position',
          value: JSON.stringify({ left: cs.left, top: cs.top, position: cs.position }),
          element: collectElementInfo(dragState.target),
        }
      }, '*');
    }
    dragState = null;
  }

  // --- Resize Handles ---
  let resizeState = null;

  function createResizeHandles() {
    var box = getSelectionBox();
    if (box.querySelector('[data-resize]')) return;

    var cursors = {
      'nw': 'nw-resize', 'ne': 'ne-resize', 'sw': 'sw-resize', 'se': 'se-resize',
      'n': 'n-resize', 's': 's-resize', 'w': 'w-resize', 'e': 'e-resize',
    };

    var positions = {
      'nw': 'top:-4px;left:-4px',
      'ne': 'top:-4px;right:-4px',
      'sw': 'bottom:-4px;left:-4px',
      'se': 'bottom:-4px;right:-4px',
      'n':  'top:-4px;left:50%;transform:translateX(-50%)',
      's':  'bottom:-4px;left:50%;transform:translateX(-50%)',
      'w':  'top:50%;left:-4px;transform:translateY(-50%)',
      'e':  'top:50%;right:-4px;transform:translateY(-50%)',
    };

    // Replace the old corner handles
    handles.forEach(function(h) { h.remove(); });
    handles.length = 0;

    Object.keys(positions).forEach(function(dir) {
      var h = document.createElement('div');
      h.dataset.resize = dir;
      h.style.cssText = 'position:absolute;width:8px;height:8px;background:#fff;border:1.5px solid #000;pointer-events:auto;cursor:' + cursors[dir] + ';border-radius:1px;' + positions[dir];
      box.appendChild(h);
      handles.push(h);

      h.addEventListener('mousedown', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (!selectedTarget) return;

        var r = selectedTarget.getBoundingClientRect();
        resizeState = {
          dir: dir,
          startX: e.clientX,
          startY: e.clientY,
          origW: r.width,
          origH: r.height,
          origLeft: parseFloat(window.getComputedStyle(selectedTarget).left) || 0,
          origTop: parseFloat(window.getComputedStyle(selectedTarget).top) || 0,
          target: selectedTarget,
        };

        document.addEventListener('mousemove', onResizeMove);
        document.addEventListener('mouseup', onResizeEnd);
      });
    });
  }

  function onResizeMove(e) {
    if (!resizeState) return;
    var dx = e.clientX - resizeState.startX;
    var dy = e.clientY - resizeState.startY;
    var dir = resizeState.dir;
    var t = resizeState.target;

    var newW = resizeState.origW;
    var newH = resizeState.origH;

    if (dir.includes('e')) newW = Math.max(20, resizeState.origW + dx);
    if (dir.includes('w')) newW = Math.max(20, resizeState.origW - dx);
    if (dir.includes('s')) newH = Math.max(20, resizeState.origH + dy);
    if (dir.includes('n')) newH = Math.max(20, resizeState.origH - dy);

    t.style.width = Math.round(newW) + 'px';
    t.style.height = Math.round(newH) + 'px';

    if (dir.includes('w')) t.style.left = Math.round(resizeState.origLeft + dx) + 'px';
    if (dir.includes('n')) t.style.top = Math.round(resizeState.origTop + dy) + 'px';

    positionSelection(t);
  }

  function onResizeEnd() {
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeEnd);

    if (resizeState && resizeState.target) {
      var cs = window.getComputedStyle(resizeState.target);
      window.parent.postMessage({
        type: 'meld:visual-edit',
        payload: {
          editType: 'resize',
          property: 'size',
          value: JSON.stringify({ width: cs.width, height: cs.height }),
          element: collectElementInfo(resizeState.target),
        }
      }, '*');
    }
    resizeState = null;
  }

  // --- Border Radius Visual Editor ---
  let radiusHandles = [];

  function showRadiusHandles(target) {
    hideRadiusHandles();
    var r = target.getBoundingClientRect();
    var cs = window.getComputedStyle(target);
    var br = parseFloat(cs.borderRadius) || 0;

    // Show one handle at top-left corner
    var handle = document.createElement('div');
    handle.id = '__meld-radius-handle';
    handle.style.cssText = 'position:fixed;width:10px;height:10px;background:#8B5CF6;border:1.5px solid #fff;border-radius:50%;pointer-events:auto;cursor:pointer;z-index:2147483646;transition:transform 0.1s';
    handle.title = 'Drag to adjust border-radius';

    // Position: offset from corner by radius amount
    var offset = Math.min(br, r.width / 2, r.height / 2);
    handle.style.left = (r.left + offset - 5) + 'px';
    handle.style.top = (r.top + offset - 5) + 'px';

    document.body.appendChild(handle);
    radiusHandles.push(handle);

    // Radius label
    var label = document.createElement('div');
    label.id = '__meld-radius-label';
    label.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;background:#8B5CF6;color:#fff;font-size:10px;font-family:monospace;padding:2px 6px;border-radius:4px;white-space:nowrap;display:none';
    document.body.appendChild(label);
    radiusHandles.push(label);

    handle.addEventListener('mousedown', function(e) {
      e.preventDefault();
      e.stopPropagation();

      var startX = e.clientX;
      var startY = e.clientY;
      var startR = br;

      label.style.display = 'block';

      function onMove(ev) {
        var dx = ev.clientX - startX;
        var dy = ev.clientY - startY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var direction = (dx + dy > 0) ? 1 : -1;
        var newR = Math.max(0, Math.round(startR + direction * dist * 0.5));
        newR = Math.min(newR, r.width / 2, r.height / 2);

        target.style.borderRadius = newR + 'px';

        // Update handle position
        var newOffset = Math.min(newR, r.width / 2, r.height / 2);
        handle.style.left = (r.left + newOffset - 5) + 'px';
        handle.style.top = (r.top + newOffset - 5) + 'px';

        // Update label
        label.textContent = newR + 'px';
        label.style.left = (r.left + newOffset + 10) + 'px';
        label.style.top = (r.top + newOffset - 5) + 'px';

        positionSelection(target);
      }

      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        label.style.display = 'none';

        var finalR = parseFloat(target.style.borderRadius) || 0;
        if (Math.round(finalR) !== Math.round(startR)) {
          window.parent.postMessage({
            type: 'meld:visual-edit',
            payload: {
              editType: 'borderRadius',
              property: 'border-radius',
              value: Math.round(finalR) + 'px',
              element: collectElementInfo(target),
            }
          }, '*');
        }
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function hideRadiusHandles() {
    radiusHandles.forEach(function(h) { h.remove(); });
    radiusHandles = [];
  }

  // --- Quick Align Toolbar ---
  let alignToolbar = null;

  function showAlignToolbar(target) {
    hideAlignToolbar();

    var r = target.getBoundingClientRect();
    var bar = document.createElement('div');
    bar.id = '__meld-align-toolbar';
    bar.style.cssText = 'position:fixed;z-index:2147483647;display:flex;align-items:center;gap:2px;background:#1A1A1A;border-radius:8px;padding:3px;box-shadow:0 4px 20px rgba(0,0,0,0.4);font-family:-apple-system,sans-serif';

    var parent = target.parentElement;
    var parentCS = parent ? window.getComputedStyle(parent) : null;
    var isFlex = parentCS && (parentCS.display === 'flex' || parentCS.display === 'inline-flex');
    var isGrid = parentCS && (parentCS.display === 'grid' || parentCS.display === 'inline-grid');

    var alignActions = [
      { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="4" x2="4" y2="20"/><rect x="8" y="6" width="12" height="4"/><rect x="8" y="14" width="8" height="4"/></svg>', title: 'Align Left', action: function() { applyAlign(target, 'left'); } },
      { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="4" x2="12" y2="20"/><rect x="4" y="6" width="16" height="4"/><rect x="6" y="14" width="12" height="4"/></svg>', title: 'Align Center', action: function() { applyAlign(target, 'center'); } },
      { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="20" y1="4" x2="20" y2="20"/><rect x="4" y="6" width="12" height="4"/><rect x="8" y="14" width="8" height="4"/></svg>', title: 'Align Right', action: function() { applyAlign(target, 'right'); } },
      { type: 'divider' },
      { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="4" x2="20" y2="4"/><rect x="6" y="8" width="4" height="12"/><rect x="14" y="8" width="4" height="8"/></svg>', title: 'Align Top', action: function() { applyAlign(target, 'top'); } },
      { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="12" x2="20" y2="12"/><rect x="6" y="4" width="4" height="16"/><rect x="14" y="6" width="4" height="12"/></svg>', title: 'Align Middle', action: function() { applyAlign(target, 'middle'); } },
      { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="20" x2="20" y2="20"/><rect x="6" y="4" width="4" height="12"/><rect x="14" y="8" width="4" height="8"/></svg>', title: 'Align Bottom', action: function() { applyAlign(target, 'bottom'); } },
    ];

    alignActions.forEach(function(item) {
      if (item.type === 'divider') {
        var d = document.createElement('div');
        d.style.cssText = 'width:1px;height:20px;background:rgba(255,255,255,0.1);margin:0 2px';
        bar.appendChild(d);
        return;
      }
      var btn = document.createElement('button');
      btn.title = item.title;
      btn.innerHTML = item.icon;
      btn.style.cssText = 'display:flex;align-items:center;justify-content:center;width:28px;height:28px;border:none;background:transparent;color:#999;border-radius:6px;cursor:pointer;transition:all 0.1s';
      btn.onmouseenter = function() { btn.style.background = 'rgba(255,255,255,0.1)'; btn.style.color = '#fff'; };
      btn.onmouseleave = function() { btn.style.background = 'transparent'; btn.style.color = '#999'; };
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        item.action();
      });
      bar.appendChild(btn);
    });

    // Position: above the selection
    bar.style.left = r.left + 'px';
    bar.style.top = Math.max(0, r.top - 42) + 'px';

    document.body.appendChild(bar);
    alignToolbar = bar;
  }

  function applyAlign(target, alignment) {
    var parent = target.parentElement;
    if (!parent) return;

    var cs = window.getComputedStyle(parent);
    var isFlex = cs.display === 'flex' || cs.display === 'inline-flex';

    // Apply to parent container
    if (isFlex || true) {
      if (alignment === 'left') { parent.style.justifyContent = 'flex-start'; parent.style.textAlign = 'left'; }
      else if (alignment === 'center') { parent.style.justifyContent = 'center'; parent.style.textAlign = 'center'; }
      else if (alignment === 'right') { parent.style.justifyContent = 'flex-end'; parent.style.textAlign = 'right'; }
      else if (alignment === 'top') { parent.style.alignItems = 'flex-start'; }
      else if (alignment === 'middle') { parent.style.alignItems = 'center'; }
      else if (alignment === 'bottom') { parent.style.alignItems = 'flex-end'; }
    }

    // Also apply text-align to the target itself
    if (alignment === 'left' || alignment === 'center' || alignment === 'right') {
      target.style.textAlign = alignment;
    }

    positionSelection(target);

    window.parent.postMessage({
      type: 'meld:visual-edit',
      payload: {
        editType: 'align',
        property: 'alignment',
        value: alignment,
        element: collectElementInfo(target),
        parentElement: collectElementInfo(parent),
      }
    }, '*');
  }

  function hideAlignToolbar() {
    if (alignToolbar) { alignToolbar.remove(); alignToolbar = null; }
  }

  // Update positionSelection to include new features
  var _origPositionSelection = positionSelection;
  positionSelection = function(target) {
    _origPositionSelection(target);
    if (target) {
      createResizeHandles();
      showRadiusHandles(target);
      showAlignToolbar(target);
    } else {
      hideRadiusHandles();
      hideAlignToolbar();
    }
  };

  // --- Event Handlers ---
  function isMeldElement(t) {
    if (!t) return false;
    var id = t.id || '';
    if (id.startsWith('__meld-')) return true;
    var p = t;
    while (p) {
      if (p.id && p.id.startsWith('__meld-')) return true;
      p = p.parentElement;
    }
    return false;
  }

  function handleMouseOver(e) {
    if (!inspectorEnabled || editingText) return;
    var t = e.target;
    if (isMeldElement(t) || t === document.body || t === document.documentElement) return;
    currentTarget = t;
    positionHover(t);
  }

  function handleMouseOut(e) {
    if (!inspectorEnabled) return;
    if (!e.relatedTarget || e.relatedTarget === document.documentElement) {
      positionHover(null);
      currentTarget = null;
    }
  }

  function handleClick(e) {
    if (!inspectorEnabled || editingText) return;
    var t = e.target;

    // Context menu click
    if (contextMenu && contextMenu.contains(t)) {
      var actionEl = t.closest('[data-action]');
      var action = actionEl ? actionEl.dataset.action : null;
      var prop = actionEl ? actionEl.dataset.prop : '';
      // Ignore clicks inside sub-panels (sliders, inputs, preset buttons)
      if (!action && contextMenu.contains(t)) { e.preventDefault(); e.stopPropagation(); return; }

      if (action === 'editText') { startTextEdit(selectedTarget); hideContextMenu(); }
      else if (action === 'changeColor') { showColorPicker(selectedTarget, prop); hideContextMenu(); }
      else if (action === 'copyStyles') {
        var styles = getComputedStyles(selectedTarget);
        if (styles) navigator.clipboard.writeText(JSON.stringify(styles, null, 2));
        hideContextMenu();
      }
      else if (action === 'askAi') {
        window.parent.postMessage({ type: 'meld:ask-ai', payload: collectElementInfo(selectedTarget) }, '*');
        hideContextMenu();
      }
      else if (action === 'changeFontSize') {
        closeSubPanel();
        var subC = contextMenu.querySelector('#__meld-ctx-sub');
        if (subC) {
          var curFS = parseFloat(window.getComputedStyle(selectedTarget).fontSize) || 16;
          var panel = buildSliderPanel('Font Size', 10, 72, 1, Math.round(curFS), 'px',
            function(v) { selectedTarget.style.fontSize = v + 'px'; },
            function(v) {
              window.parent.postMessage({ type: 'meld:visual-edit', payload: { editType: 'fontSize', property: 'font-size', value: v + 'px', element: collectElementInfo(selectedTarget) } }, '*');
            }
          );
          subC.appendChild(panel);
          activeSubPanel = panel;
        }
      }
      else if (action === 'changeOpacity') {
        closeSubPanel();
        var subC2 = contextMenu.querySelector('#__meld-ctx-sub');
        if (subC2) {
          var curOp = Math.round((parseFloat(window.getComputedStyle(selectedTarget).opacity) || 1) * 100);
          var panel2 = buildSliderPanel('Opacity', 0, 100, 1, curOp, '%',
            function(v) { selectedTarget.style.opacity = (v / 100).toFixed(2); },
            function(v) {
              window.parent.postMessage({ type: 'meld:visual-edit', payload: { editType: 'opacity', property: 'opacity', value: (v / 100).toFixed(2), element: collectElementInfo(selectedTarget) } }, '*');
            }
          );
          subC2.appendChild(panel2);
          activeSubPanel = panel2;
        }
      }
      else if (action === 'changeGap') {
        closeSubPanel();
        var subC3 = contextMenu.querySelector('#__meld-ctx-sub');
        if (subC3) {
          var curGapVal = parseFloat(window.getComputedStyle(selectedTarget).gap) || 0;
          var panel3 = buildSliderPanel('Gap', 0, 64, 1, Math.round(curGapVal), 'px',
            function(v) { selectedTarget.style.gap = v + 'px'; positionSelection(selectedTarget); },
            function(v) {
              window.parent.postMessage({ type: 'meld:visual-edit', payload: { editType: 'gap', property: 'gap', value: v + 'px', element: collectElementInfo(selectedTarget) } }, '*');
            }
          );
          subC3.appendChild(panel3);
          activeSubPanel = panel3;
        }
      }
      else if (action === 'changeShadow') {
        closeSubPanel();
        var subC4 = contextMenu.querySelector('#__meld-ctx-sub');
        if (subC4) {
          var curSh = window.getComputedStyle(selectedTarget).boxShadow || 'none';
          var panel4 = buildShadowPresetPanel(curSh, function(val, label) {
            selectedTarget.style.boxShadow = val;
            window.parent.postMessage({ type: 'meld:visual-edit', payload: { editType: 'shadow', property: 'box-shadow', value: val, element: collectElementInfo(selectedTarget) } }, '*');
            hideContextMenu();
          });
          subC4.appendChild(panel4);
          activeSubPanel = panel4;
        }
      }
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Spacing zone drag
    if (t.dataset && t.dataset.side) {
      handleSpacingDrag(e);
      return;
    }

    if (isMeldElement(t)) return;

    hideContextMenu();
    hideColorPicker();

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    selectedTarget = t;
    positionSelection(t);
    positionHover(null);

    var info = collectElementInfo(t);
    window.parent.postMessage({ type: 'meld:element-selected', payload: info }, '*');
  }

  // Double-click: inline text edit
  function handleDblClick(e) {
    if (!inspectorEnabled) return;
    var t = e.target;
    if (isMeldElement(t)) return;

    e.preventDefault();
    e.stopPropagation();

    // Check if element has direct text content
    var hasDirectText = Array.from(t.childNodes).some(function(n) { return n.nodeType === 3 && n.textContent.trim(); });
    if (hasDirectText) {
      startTextEdit(t);
    }
  }

  // Right-click: context menu
  function handleContextMenu(e) {
    if (!inspectorEnabled || !selectedTarget) return;
    e.preventDefault();
    e.stopPropagation();
    hideColorPicker();
    showContextMenu(e.clientX, e.clientY, selectedTarget);
  }

  function handleScrollOrResize() {
    if (inspectorEnabled && currentTarget) positionHover(currentTarget);
    if (selectedTarget && !editingText) positionSelection(selectedTarget);
    hideContextMenu();
    hideColorPicker();
    if (!selectedTarget) { hideRadiusHandles(); hideAlignToolbar(); }
  }

  // Close popups on click outside
  function handleDocClick(e) {
    if (contextMenu && contextMenu.style.display !== 'none' && !contextMenu.contains(e.target)) {
      hideContextMenu();
    }
    if (colorPicker && !colorPicker.contains(e.target)) {
      hideColorPicker();
    }
  }

  function setInspectorMode(enabled) {
    inspectorEnabled = enabled;
    if (!enabled) {
      positionHover(null);
      positionSelection(null);
      hideContextMenu();
      hideColorPicker();
      hideRadiusHandles();
      hideAlignToolbar();
      currentTarget = null;
      selectedTarget = null;
      editingText = false;
      dragState = null;
      resizeState = null;
      document.body.style.cursor = '';
    } else {
      document.body.style.cursor = 'crosshair';
    }
  }

  // --- Messages from parent ---
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'meld:toggle-inspector') {
      setInspectorMode(!!e.data.enabled);
    }
    if (e.data && e.data.type === 'meld:apply-style') {
      var target = selectedTarget || document.querySelector(e.data.selector);
      if (target) {
        target.style.setProperty(e.data.property, e.data.value);
        // Update selection overlay
        positionSelection(target);
        // Send back updated computed styles
        var info = collectElementInfo(target);
        window.parent.postMessage({ type: 'meld:element-selected', payload: info }, '*');
      }
    }
    if (e.data && e.data.type === 'meld:clear-selection') {
      selectedTarget = null;
      positionSelection(null);
      hideContextMenu();
      hideColorPicker();
    }
  });

  // Mousedown: start drag if on selected element
  function handleMouseDown(e) {
    if (!inspectorEnabled || !selectedTarget || editingText) return;
    if (isMeldElement(e.target)) return;
    // Only drag the selected target (not just any element)
    if (e.target === selectedTarget || selectedTarget.contains(e.target)) {
      if (e.button === 0 && !e.target.dataset.side && !e.target.dataset.resize) {
        startDrag(e);
      }
    }
  }

  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('mouseout', handleMouseOut, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('dblclick', handleDblClick, true);
  document.addEventListener('contextmenu', handleContextMenu, true);
  document.addEventListener('mousedown', handleMouseDown, true);
  document.addEventListener('mousedown', handleDocClick, false);
  window.addEventListener('scroll', handleScrollOrResize, true);
  window.addEventListener('resize', handleScrollOrResize);
})();
`;
