(() => {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#nav');
  const modal = document.querySelector('#join-modal');
  const openButton = document.querySelector('#join-btn');
  const closeButton = document.querySelector('#modal-close');
  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }));
  }
  const close = () => { if (modal) modal.hidden = true; if (openButton) openButton.focus(); };
  if (openButton && modal) openButton.addEventListener('click', () => { modal.hidden = false; if (closeButton) closeButton.focus(); });
  if (closeButton) closeButton.addEventListener('click', close);
  if (modal) modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal && !modal.hidden) close(); });
})();