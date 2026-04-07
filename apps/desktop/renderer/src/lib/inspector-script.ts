/**
 * Inspector script injected into the iframe
 * - Hover: blue overlay
 * - Click: black border + corner handles + label (Figma-style selection)
 */
export const INSPECTOR_SCRIPT = `
(function() {
  'use strict';
  if (window.__meldInspectorLoaded) return;
  window.__meldInspectorLoaded = true;

  let inspectorEnabled = false;
  let currentTarget = null;
  let selectedTarget = null;

  // --- Hover overlay (blue, translucent) ---
  let hoverOverlay = null;
  function getHoverOverlay() {
    if (hoverOverlay) return hoverOverlay;
    const el = document.createElement('div');
    el.id = '__meld-hover-overlay';
    el.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483646;border:1.5px solid #3B82F6;background:rgba(59,130,246,0.06);border-radius:2px;transition:all 0.08s ease-out;display:none';
    document.body.appendChild(el);
    hoverOverlay = el;
    return el;
  }

  function positionHover(target) {
    const ov = getHoverOverlay();
    if (!target || target === selectedTarget) {
      ov.style.display = 'none';
      return;
    }
    const r = target.getBoundingClientRect();
    ov.style.display = 'block';
    ov.style.top = r.top + 'px';
    ov.style.left = r.left + 'px';
    ov.style.width = r.width + 'px';
    ov.style.height = r.height + 'px';
  }

  // --- Selection overlay (black border + corner handles + label) ---
  let selectionBox = null;
  let selectionLabel = null;
  const handles = [];
  const HANDLE_SIZE = 8;

  function getSelectionBox() {
    if (selectionBox) return selectionBox;
    const el = document.createElement('div');
    el.id = '__meld-selection-box';
    el.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;border:1.5px solid #000;display:none';
    document.body.appendChild(el);
    selectionBox = el;

    // 4 corner handles
    const positions = [
      { top: '-HALF', left: '-HALF' },
      { top: '-HALF', right: '-HALF' },
      { bottom: '-HALF', left: '-HALF' },
      { bottom: '-HALF', right: '-HALF' },
    ];
    const half = HANDLE_SIZE / 2;
    positions.forEach(function(pos) {
      const h = document.createElement('div');
      h.style.cssText = 'position:absolute;width:' + HANDLE_SIZE + 'px;height:' + HANDLE_SIZE + 'px;background:#000;border:1px solid #fff;pointer-events:none';
      if ('top' in pos) h.style.top = -half + 'px';
      if ('bottom' in pos) h.style.bottom = -half + 'px';
      if ('left' in pos) h.style.left = -half + 'px';
      if ('right' in pos) h.style.right = -half + 'px';
      el.appendChild(h);
      handles.push(h);
    });

    return el;
  }

  function getSelectionLabel() {
    if (selectionLabel) return selectionLabel;
    const el = document.createElement('div');
    el.id = '__meld-selection-label';
    el.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;display:inline-flex;align-items:center;gap:4px;background:#000;color:#fff;font-size:11px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:3px 8px;border-radius:4px;white-space:nowrap;display:none';
    // Cursor icon SVG
    el.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg><span></span>';
    document.body.appendChild(el);
    selectionLabel = el;
    return el;
  }

  function positionSelection(target) {
    const box = getSelectionBox();
    const label = getSelectionLabel();
    if (!target) {
      box.style.display = 'none';
      label.style.display = 'none';
      return;
    }
    const r = target.getBoundingClientRect();
    box.style.display = 'block';
    box.style.top = r.top + 'px';
    box.style.left = r.left + 'px';
    box.style.width = r.width + 'px';
    box.style.height = r.height + 'px';

    const name = getReactComponentName(target);
    const tag = target.tagName.toLowerCase();
    const textSpan = label.querySelector('span');
    textSpan.textContent = name || tag;
    label.style.display = 'inline-flex';
    label.style.left = r.left + 'px';
    label.style.top = Math.max(0, r.top - 26) + 'px';
  }

  // --- Extract React Fiber component name ---
  function getReactComponentName(el) {
    const keys = Object.keys(el);
    for (const key of keys) {
      if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) {
        let fiber = el[key];
        while (fiber) {
          if (fiber.type && typeof fiber.type === 'function') {
            const n = fiber.type.displayName || fiber.type.name;
            if (n && /^[A-Z]/.test(n)) return n;
          }
          if (fiber.type && typeof fiber.type === 'object' && fiber.type.$$typeof) {
            const inner = fiber.type.render || fiber.type.type;
            if (inner) {
              const n = inner.displayName || inner.name;
              if (n && /^[A-Z]/.test(n)) return n;
            }
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
    const parts = [];
    let node = el;
    while (node && node !== document.body && parts.length < 5) {
      let s = node.tagName.toLowerCase();
      if (node.id) { parts.unshift('#' + node.id); break; }
      if (node.className && typeof node.className === 'string') {
        const cls = node.className.trim().split(/\\s+/).slice(0, 2).join('.');
        if (cls) s += '.' + cls;
      }
      parts.unshift(s);
      node = node.parentElement;
    }
    return parts.join(' > ');
  }

  // Extract __source info from React Fiber (auto-included in dev mode)
  function getReactSource(el) {
    const keys = Object.keys(el);
    for (const key of keys) {
      if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) {
        let fiber = el[key];
        while (fiber) {
          if (fiber._debugSource) {
            const s = fiber._debugSource;
            return (s.fileName || '') + ':' + (s.lineNumber || 0) + ':' + (s.columnNumber || 0);
          }
          fiber = fiber.return;
        }
        break;
      }
    }
    return null;
  }

  // Extract key CSS properties
  var STYLE_KEYS = [
    'display', 'position', 'width', 'height', 'padding', 'margin',
    'backgroundColor', 'color', 'fontSize', 'fontWeight', 'lineHeight',
    'borderRadius', 'border', 'gap', 'flexDirection', 'justifyContent',
    'alignItems', 'overflow', 'opacity', 'zIndex', 'boxShadow',
    'maxWidth', 'minHeight', 'textAlign', 'gridTemplateColumns',
  ];

  function getComputedStyles(el) {
    try {
      const cs = window.getComputedStyle(el);
      var result = {};
      for (var i = 0; i < STYLE_KEYS.length; i++) {
        var key = STYLE_KEYS[i];
        var val = cs.getPropertyValue(key.replace(/[A-Z]/g, function(m) { return '-' + m.toLowerCase(); }));
        if (val && val !== 'none' && val !== 'normal' && val !== 'auto' && val !== '0px' && val !== 'rgba(0, 0, 0, 0)') {
          result[key] = val;
        }
      }
      return result;
    } catch(e) {
      return null;
    }
  }

  function collectElementInfo(el) {
    const rect = el.getBoundingClientRect();
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

  // --- Event handlers ---
  function isInspectorElement(t) {
    return t === hoverOverlay || t === selectionBox || t === selectionLabel
      || handles.indexOf(t) !== -1
      || (selectionLabel && selectionLabel.contains(t));
  }

  function handleMouseOver(e) {
    if (!inspectorEnabled) return;
    const t = e.target;
    if (isInspectorElement(t) || t === document.body || t === document.documentElement) return;
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
    if (!inspectorEnabled) return;
    const t = e.target;
    if (isInspectorElement(t)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    selectedTarget = t;
    positionSelection(t);
    positionHover(null); // Hide hover

    const info = collectElementInfo(t);
    window.parent.postMessage({ type: 'meld:element-selected', payload: info }, '*');
  }

  function handleScrollOrResize() {
    if (inspectorEnabled && currentTarget) positionHover(currentTarget);
    if (selectedTarget) positionSelection(selectedTarget);
  }

  function setInspectorMode(enabled) {
    inspectorEnabled = enabled;
    if (!enabled) {
      positionHover(null);
      positionSelection(null);
      currentTarget = null;
      selectedTarget = null;
      document.body.style.cursor = '';
    } else {
      document.body.style.cursor = 'crosshair';
    }
  }

  // Deselection message from parent
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'meld:toggle-inspector') {
      setInspectorMode(!!e.data.enabled);
    }
    if (e.data && e.data.type === 'meld:clear-selection') {
      selectedTarget = null;
      positionSelection(null);
    }
  });

  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('mouseout', handleMouseOut, true);
  document.addEventListener('click', handleClick, true);
  window.addEventListener('scroll', handleScrollOrResize, true);
  window.addEventListener('resize', handleScrollOrResize);
})();
`;
