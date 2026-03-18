export function init(): void {
  const root = document.getElementById('terminal-101');
  if (root) root.textContent = 'Terminal loading...';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
