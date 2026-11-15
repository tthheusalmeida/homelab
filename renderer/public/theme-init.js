// Aplica tema e cor de destaque antes do primeiro quadro (evita o "piscar" claro/escuro).
// Arquivo separado porque a CSP não permite script inline. Lê a cópia local salva por
// lib/appearance.ts (chave homelab.appearance); sem ela vale o padrão (sistema + ciano).
(function () {
  try {
    var saved = JSON.parse(localStorage.getItem('homelab.appearance') || 'null') || {};
    var dark =
      saved.theme === 'dark' ||
      (saved.theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;

    root.classList.toggle('dark', dark);
    root.style.colorScheme = dark ? 'dark' : 'light';
    root.dataset.accent = saved.accent || 'cyan';
  } catch (error) {
    // segue com o padrão do CSS
  }
})();
