'use strict';
(() => {
  // Preserve previously shared beta entry points after moving trading off the homepage.
  const params = new URLSearchParams(location.search);
  if (location.pathname.endsWith('/') || location.pathname.endsWith('/index.html')) {
    if (params.has('buy') || params.has('token') || ['#wallet-buy','#platform-token','#collection'].includes(location.hash)) {
      const beta = new URL('beta.html',location.href);
      beta.search = location.search; beta.hash = location.hash;
      location.replace(beta.href);
      return;
    }
  }
  document.querySelectorAll('[data-explainer]').forEach(button => {
    button.addEventListener('click', () => {
      const dialog = document.getElementById(button.dataset.explainer);
      if (dialog && !dialog.open) dialog.showModal();
    });
  });
  document.querySelectorAll('.experience-dialog').forEach(dialog => {
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  });
  const form = document.querySelector('#creator-form');
  if (!form) return;
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const profile = new URL(data.get('profile'));
    const status = document.querySelector('#application-status');
    const link = document.querySelector('#application-link');
    link.hidden = true;
    if (!['https:','http:'].includes(profile.protocol)) {
      status.textContent = 'Please use a public HTTP or HTTPS profile URL.';
      return;
    }
    const body = [
      '## Community launch expression of interest',
      `Project: ${data.get('project')}`,
      `Public creator profile: ${profile.href}`,
      `## Meme & concept\n${data.get('pitch')}`,
      `## Audience & prelaunch plan\n${data.get('audience')}`,
      `## Allocations, liquidity & security disclosures\n${data.get('disclosures')}`,
      '## Acknowledgement\nI understand the program is in development, the fees and pool rules are proposals, and approval or earnings are not guaranteed.'
    ].join('\n\n');
    const url = new URL('https://github.com/kaibuzz0/Offensive-meme-launch-pad/issues/new');
    url.searchParams.set('title',`[Launch application] ${data.get('project')}`);
    url.searchParams.set('body',body);
    link.href = url.href; link.hidden = false;
    status.textContent = 'Application prepared. Nothing has been sent. Review and submit it on GitHub using the link below.';
    link.focus();
  });
})();
