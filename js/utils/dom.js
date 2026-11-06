export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// Always escape text before putting it into innerHTML
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// type: 'success' | 'error'. Pass empty text to clear.
export function showMessage(target, type, text) {
  if (!target) return;
  target.innerHTML = text ? `<div class="alert ${type}">${esc(text)}</div>` : '';
}
