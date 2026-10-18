(() => {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#nav');
  const modal = document.querySelector('#join-modal');
  const openButton = document.querySelector('#join-btn');
  const closeButton = document.querySelector('#modal-close');
  const joinForm = document.querySelector('#join-form');
  const formMessage = document.querySelector('#form-message');
  const submitJoin = document.querySelector('#submit-join');
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
  if (openButton && modal) openButton.addEventListener('click', () => {
    modal.hidden = false;
    window.__joinFormOpenedAt = Date.now();
    const honeypot = joinForm?.elements.namedItem('website');
    if (honeypot) honeypot.value = '';
    if (closeButton) closeButton.focus();
  });
  if (closeButton) closeButton.addEventListener('click', close);

  if (joinForm) joinForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!formMessage || !submitJoin) return;
    const selectedInterests = [...joinForm.querySelectorAll('input[name="interests"]:checked')].map(input => input.value);
    if (!selectedInterests.length) {
      formMessage.textContent = 'يرجى اختيار مجال اهتمام واحد على الأقل.';
      formMessage.className = 'form-message error';
      return;
    }
    const values = new FormData(joinForm);
    const payload = {
      full_name: String(values.get('full_name') || '').trim(),
      birth_date: values.get('birth_date') || null,
      municipality: String(values.get('municipality') || '').trim(),
      phone: String(values.get('phone') || '').trim(),
      email: String(values.get('email') || '').trim() || null,
      interests: selectedInterests,
      experience: String(values.get('experience') || '').trim() || null,
      consent: values.get('consent') === 'on',
      website: String(values.get('website') || ''),
      form_started_at: window.__joinFormOpenedAt || 0
    };
    submitJoin.disabled = true;
    submitJoin.textContent = 'جارٍ إرسال الطلب…';
    formMessage.textContent = '';
    formMessage.className = 'form-message';
    try {
      const response = await fetch('https://lfubzohsbwdoiagfkpkt.supabase.co/functions/v1/submit-join-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'sb_publishable_tCZjOnFHLIeQHF0mR9tVFA_9bu4lLrJ'
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'تعذر إرسال الطلب.');
      joinForm.reset();
      window.__joinFormOpenedAt = 0;
      const reference = result.request_ref ? ' رقم المرجع: ' + result.request_ref + '.' : '';
      formMessage.textContent = 'تم إرسال طلب الانخراط بنجاح.' + reference + ' سيبقى قيد المراجعة، وإرساله لا يعني قبوله أو إتمام إجراءات الانخراط.';
      formMessage.className = 'form-message success';
      submitJoin.textContent = 'تم الإرسال';
    } catch (error) {
      console.error('Join request submission failed:', error);
      formMessage.textContent = 'لم نتمكن من إرسال الطلب الآن. يرجى المحاولة لاحقًا.';
      formMessage.className = 'form-message error';
      submitJoin.textContent = 'إعادة المحاولة';
    } finally {
      submitJoin.disabled = false;
    }
  });

  if (modal) modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal && !modal.hidden) close(); });
})();