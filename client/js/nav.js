export function showView(id) {
  document.querySelectorAll('#view-search, #view-results').forEach(el => {
    el.classList.toggle('hidden', el.id !== id);
  });
}

export function showLoading(visible) {
  document.getElementById('loading-overlay').classList.toggle('hidden', !visible);
}

let toastTimer = null;

export function showToast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = type === 'error' ? 'error' : '';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 4000);
}

export function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
