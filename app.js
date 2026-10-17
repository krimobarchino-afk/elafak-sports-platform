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
  if (openButton && modal) openButton.addEventListener('click', () => { modal.hidden = false; if (closeButton) closeButton.focus(); });
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
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      formMessage.textContent = 'تعذر تحميل خدمة الإرسال. يرجى المحاولة لاحقًا.';
      formMessage.className = 'form-message error';
      return;
    }
    const client = window.supabase.createClient('https://lfubzohsbwdoiagfkpkt.supabase.co', 'sb_publishable_tCZjOnFHLIeQHF0mR9tVFA_9bu4lLrJ');
    const values = new FormData(joinForm);
    const payload = {
      full_name: String(values.get('full_name') || '').trim(),
      birth_date: values.get('birth_date') || null,
      municipality: String(values.get('municipality') || '').trim(),
      phone: String(values.get('phone') || '').trim(),
      email: String(values.get('email') || '').trim() || null,
      interests: selectedInterests,
      experience: String(values.get('experience') || '').trim() || null,
      consent: values.get('consent') === 'on'
    };
    submitJoin.disabled = true;
    submitJoin.textContent = 'جارٍ إرسال الطلب…';
    formMessage.textContent = '';
    formMessage.className = 'form-message';
    try {
      const result = await client.from('join_requests').insert(payload);
      if (result.error) throw result.error;
      joinForm.reset();
      formMessage.textContent = 'تم إرسال طلب الانخراط بنجاح. سيبقى قيد المراجعة، وإرساله لا يعني قبوله أو إتمام إجراءات الانخراط.';
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