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
      const submittedRef = result.request_ref || '';
      joinForm.hidden = true;
      const successPanel = document.querySelector('#join-success');
      const referenceOutput = document.querySelector('#join-success-reference');
      if (referenceOutput) referenceOutput.textContent = submittedRef || 'لم يُرجع النظام رقم المرجع؛ يرجى التواصل مع الجمعية.';
      const copyReferenceButton = document.querySelector('#copy-join-reference');
      const copyTrackingLinkButton = document.querySelector('#copy-join-tracking-link');
      const makeTrackingUrl = () => {
        const url = new URL(window.location.href);
        url.searchParams.set('ref', submittedRef);
        url.hash = 'track';
        return url.toString();
      };
      if (copyReferenceButton) {
        copyReferenceButton.hidden = !submittedRef;
        copyReferenceButton.onclick = async () => {
          try {
            await navigator.clipboard.writeText(submittedRef);
            copyReferenceButton.textContent = 'تم نسخ المرجع';
          } catch (_) {
            const range = document.createRange();
            range.selectNodeContents(referenceOutput);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            copyReferenceButton.textContent = 'حدد المرجع وانسخه';
          }
        };
      }
      if (copyTrackingLinkButton) {
        copyTrackingLinkButton.hidden = !submittedRef;
        copyTrackingLinkButton.onclick = async () => {
          try {
            await navigator.clipboard.writeText(makeTrackingUrl());
            copyTrackingLinkButton.textContent = 'تم نسخ رابط المتابعة';
          } catch (_) {
            copyTrackingLinkButton.textContent = 'تعذر النسخ؛ انسخ رابط الصفحة وأضف ?ref=' + encodeURIComponent(submittedRef) + '#track';
          }
        };
      }
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
  const trackReferenceInput = document.querySelector('#track-ref');
  const urlReference = new URLSearchParams(window.location.search).get('ref');
  if (trackReferenceInput && urlReference) {
    trackReferenceInput.value = urlReference.slice(0, 80);
    if (window.location.hash === '#track') {
      window.addEventListener('load', () => document.querySelector('#track')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), { once: true });
    }
  }
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
  const getSavedTrack = () => null;
  if (trackForm && trackMessage && trackSubmit) {
    trackForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const values = new FormData(trackForm);
      await runLookup(String(values.get('request_ref') || '').trim(), String(values.get('phone') || '').trim(), trackMessage, trackSubmit);

    });
  }
  const closeSuccess = document.querySelector('#join-success-close');
  if (closeSuccess) closeSuccess.addEventListener('click', () => { if (modal) modal.hidden = true; });

  if (modal) modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal && !modal.hidden) close(); });
})();