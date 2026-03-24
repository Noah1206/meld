/**
 * iframe 내부에 주입될 인스펙터 스크립트 (문자열 상수)
 * - 호버 시 파란 아웃라인 하이라이트
 * - 클릭 시 엘리먼트 정보 수집 + postMessage 전송
 * - React Fiber 탐색으로 컴포넌트명 추출
 */
export const INSPECTOR_SCRIPT = /* js */ `
(function() {
  'use strict';

  let inspectorEnabled = false;
  let overlay = null;
  let currentTarget = null;

  // 오버레이 엘리먼트 생성
  function createOverlay() {
    if (overlay) return overlay;
    const el = document.createElement('div');
    el.id = '__meld-inspector-overlay';
    el.style.cssText = [
      'position: fixed',
      'pointer-events: none',
      'z-index: 2147483647',
      'border: 2px solid #3B82F6',
      'background: rgba(59, 130, 246, 0.08)',
      'border-radius: 4px',
      'transition: all 0.1s ease-out',
      'display: none',
    ].join(';');
    document.body.appendChild(el);
    overlay = el;
    return el;
  }

  // 오버레이 위치 업데이트
  function positionOverlay(target) {
    const ov = createOverlay();
    if (!target) {
      ov.style.display = 'none';
      return;
    }
    const rect = target.getBoundingClientRect();
    ov.style.display = 'block';
    ov.style.top = rect.top + 'px';
    ov.style.left = rect.left + 'px';
    ov.style.width = rect.width + 'px';
    ov.style.height = rect.height + 'px';
  }

  // React Fiber에서 컴포넌트명 추출
  function getReactComponentName(el) {
    const keys = Object.keys(el);
    for (const key of keys) {
      if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) {
        let fiber = el[key];
        // 가장 가까운 사용자 정의 컴포넌트 탐색 (대문자 시작)
        while (fiber) {
          if (fiber.type && typeof fiber.type === 'function') {
            const name = fiber.type.displayName || fiber.type.name;
            if (name && /^[A-Z]/.test(name)) {
              return name;
            }
          }
          if (fiber.type && typeof fiber.type === 'object' && fiber.type.$$typeof) {
            const inner = fiber.type.render || fiber.type.type;
            if (inner) {
              const name = inner.displayName || inner.name;
              if (name && /^[A-Z]/.test(name)) {
                return name;
              }
            }
          }
          fiber = fiber.return;
        }
        break;
      }
    }
    return null;
  }

  // CSS 선택자 생성
  function buildSelector(el) {
    if (el.id) return '#' + el.id;
    const parts = [];
    let node = el;
    while (node && node !== document.body && parts.length < 5) {
      let selector = node.tagName.toLowerCase();
      if (node.id) {
        parts.unshift('#' + node.id);
        break;
      }
      if (node.className && typeof node.className === 'string') {
        const cls = node.className.trim().split(/\\s+/).slice(0, 2).join('.');
        if (cls) selector += '.' + cls;
      }
      parts.unshift(selector);
      node = node.parentElement;
    }
    return parts.join(' > ');
  }

  // 엘리먼트 정보 수집
  function collectElementInfo(el) {
    const rect = el.getBoundingClientRect();
    return {
      tagName: el.tagName.toLowerCase(),
      className: typeof el.className === 'string' ? el.className : '',
      id: el.id || '',
      textContent: (el.textContent || '').trim().slice(0, 100),
      componentName: getReactComponentName(el),
      selector: buildSelector(el),
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
    };
  }

  // 이벤트 핸들러
  function handleMouseOver(e) {
    if (!inspectorEnabled) return;
    const target = e.target;
    if (target === overlay || target === document.body || target === document.documentElement) return;
    currentTarget = target;
    positionOverlay(target);
  }

  function handleMouseOut(e) {
    if (!inspectorEnabled) return;
    if (!e.relatedTarget || e.relatedTarget === document.documentElement) {
      positionOverlay(null);
      currentTarget = null;
    }
  }

  function handleClick(e) {
    if (!inspectorEnabled) return;
    const target = e.target;
    if (target === overlay) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const info = collectElementInfo(target);
    window.parent.postMessage({
      type: 'meld:element-selected',
      payload: info,
    }, '*');
  }

  // 스크롤/리사이즈 시 오버레이 업데이트
  function handleScrollOrResize() {
    if (inspectorEnabled && currentTarget) {
      positionOverlay(currentTarget);
    }
  }

  // 인스펙터 모드 토글
  function setInspectorMode(enabled) {
    inspectorEnabled = enabled;
    if (!enabled) {
      positionOverlay(null);
      currentTarget = null;
      document.body.style.cursor = '';
    } else {
      document.body.style.cursor = 'crosshair';
    }
  }

  // 부모 프레임에서 메시지 수신
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'meld:toggle-inspector') {
      setInspectorMode(!!e.data.enabled);
    }
  });

  // 이벤트 등록 (capture: true로 클릭 차단 우선)
  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('mouseout', handleMouseOut, true);
  document.addEventListener('click', handleClick, true);
  window.addEventListener('scroll', handleScrollOrResize, true);
  window.addEventListener('resize', handleScrollOrResize);
})();
`;
