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
      const submittedPhone = payload.phone;
      const submittedRef = result.request_ref || '';
      if (submittedRef && submittedPhone) {
        try { sessionStorage.setItem('elafak_join_followup', JSON.stringify({ request_ref: submittedRef, phone: submittedPhone })); } catch (_) {}
      }
      joinForm.hidden = true;
      const successPanel = document.querySelector('#join-success');
      if (successPanel) successPanel.hidden = false;
      window.__joinFormOpenedAt = 0;
      formMessage.textContent = '';
      formMessage.className = 'form-message';
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


  const trackForm = document.querySelector('#track-form');
  const trackMessage = document.querySelector('#track-message');
  const trackSubmit = document.querySelector('#track-submit');
  const savedTrackButton = document.querySelector('#saved-track-button');
  const savedTrackMessage = document.querySelector('#saved-track-message');
  const runLookup = async (request_ref, phone, messageEl, buttonEl) => {
    if (!request_ref || !phone || !messageEl) return;
    if (buttonEl) { buttonEl.disabled = true; buttonEl.textContent = 'جارٍ التحقق…'; }
    messageEl.textContent = 'جارٍ التحقق من حالة الطلب…';
    messageEl.className = 'form-message';
    try {
      const response = await fetch('https://lfubzohsbwdoiagfkpkt.supabase.co/functions/v1/lookup-join-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': 'sb_publishable_tCZjOnFHLIeQHF0mR9tVFA_9bu4lLrJ' },
        body: JSON.stringify({ request_ref, phone })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'تعذر التحقق من الحالة.');
      messageEl.textContent = 'حالة الطلب: ' + result.status_label + '. ' + result.message;
      messageEl.className = 'form-message success';
    } catch (error) {
      messageEl.textContent = error.message || 'تعذر التحقق الآن. يرجى المحاولة لاحقًا.';
      messageEl.className = 'form-message error';
    } finally {
      if (buttonEl) { buttonEl.disabled = false; buttonEl.textContent = 'متابعة طلبي'; }
    }
  };
  const getSavedTrack = () => {
    try { return JSON.parse(sessionStorage.getItem('elafak_join_followup') || 'null'); } catch (_) { return null; }
  };
  const savedTrack = getSavedTrack();
  if (savedTrack && savedTrack.request_ref && savedTrack.phone && trackForm && savedTrackButton) {
    trackForm.hidden = true;
    savedTrackButton.hidden = false;
    savedTrackButton.addEventListener('click', () => runLookup(savedTrack.request_ref, savedTrack.phone, savedTrackMessage, savedTrackButton));
  }
  if (trackForm && trackMessage && trackSubmit) {
    trackForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const values = new FormData(trackForm);
      await runLookup(String(values.get('request_ref') || '').trim(), String(values.get('phone') || '').trim(), trackMessage, trackSubmit);
      if (trackMessage.classList.contains('success')) {
        try { sessionStorage.setItem('elafak_join_followup', JSON.stringify({ request_ref: String(values.get('request_ref') || '').trim(), phone: String(values.get('phone') || '').trim() })); } catch (_) {}
        if (savedTrackButton) savedTrackButton.hidden = false;
      }
    });
  }
  const followFromSuccess = document.querySelector('#join-success-track');
  if (followFromSuccess) followFromSuccess.addEventListener('click', () => {
    if (modal) modal.hidden = true;
    const trackSection = document.querySelector('#track');
    if (trackSection) trackSection.scrollIntoView({ behavior: 'smooth' });
    const saved = getSavedTrack();
    if (saved && savedTrackMessage && savedTrackButton) {
      savedTrackButton.hidden = false;
      runLookup(saved.request_ref, saved.phone, savedTrackMessage, savedTrackButton);
    }
  });
  const closeSuccess = document.querySelector('#join-success-close');
  if (closeSuccess) closeSuccess.addEventListener('click', () => { if (modal) modal.hidden = true; });

  if (modal) modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal && !modal.hidden) close(); });
})();