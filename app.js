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
    const requirementBoxAtLookup = document.querySelector('#track-requirements');
    if (requirementBoxAtLookup) requirementBoxAtLookup.hidden = true;
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
      const requirementBox = document.querySelector('#track-requirements');
      if (requirementBox) {
        requirementBox.replaceChildren();
        const requirements = Array.isArray(result.requirements) ? result.requirements : [];
        if (result.status === 'approved') {
          const heading = document.createElement('h3');
          heading.textContent = 'متطلبات استكمال الملف';
          requirementBox.append(heading);
          if (!requirements.length) {
            const note = document.createElement('p');
            note.textContent = 'لم تعتمد الجمعية قائمة وثائق بعد. يرجى انتظار تعليمات الجمعية أو التواصل معها عبر قنواتها الرسمية.';
            requirementBox.append(note);
          } else {
            const list = document.createElement('ul');
            requirements.forEach(item => {
              const li = document.createElement('li');
              const name = document.createElement('strong');
              name.textContent = item.title || 'متطلب';
              li.append(name);
              const tag = document.createElement('span');
              tag.className = item.is_required ? 'requirement-required' : '';
              tag.textContent = item.is_required ? ' — مطلوب' : ' — عند الاقتضاء';
              li.append(tag);
              if (item.description) {
                const detail = document.createElement('p');
                detail.textContent = item.description;
                li.append(detail);
              }
              list.append(li);
            });
            requirementBox.append(list);
          }
          const fileStatus = result.file_status || null;
          const fileMessage = document.createElement('p');
          if (fileStatus) {
            fileMessage.textContent = result.file_message || 'ملفك قيد المعالجة.';
            fileMessage.className = 'form-message success';
            requirementBox.append(fileMessage);
          }
          if (!fileStatus || fileStatus === 'awaiting_upload' || fileStatus === 'needs_correction') {
            const uploadHeading = document.createElement('h3');
            uploadHeading.textContent = 'إيداع ملف الانخراط';
            requirementBox.append(uploadHeading);
            const uploadNote = document.createElement('p');
            uploadNote.textContent = 'بعد الحصول على الاستمارة الرسمية وتعليمات الجمعية، اجمع الاستمارة المملوءة والموقعة ووصل التسديد ونسخة بطاقة التعريف في ملف PDF واحد. لا يُعد رفع الوصل تأكيدًا للتسديد، ولا يعني الإيداع قبولًا نهائيًا.';
            requirementBox.append(uploadNote);
            const uploadForm = document.createElement('form');
            uploadForm.id = 'upload-join-file-form';
            uploadForm.className = 'join-file-upload';
            const label = document.createElement('label');
            label.textContent = 'ملف PDF واحد (حتى 15 ميغابايت) ';
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.name = 'file';
            fileInput.accept = 'application/pdf,.pdf';
            fileInput.required = true;
            label.append(fileInput);
            uploadForm.append(label);
            const uploadButton = document.createElement('button');
            uploadButton.type = 'submit';
            uploadButton.className = 'btn btn-dark';
            uploadButton.textContent = fileStatus === 'needs_correction' ? 'إعادة إيداع الملف المصحح' : 'إيداع الملف';
            uploadForm.append(uploadButton);
            const uploadMessage = document.createElement('p');
            uploadMessage.className = 'form-message';
            uploadMessage.setAttribute('role', 'status');
            uploadMessage.setAttribute('aria-live', 'polite');
            uploadForm.append(uploadMessage);
            uploadForm.addEventListener('submit', async (uploadEvent) => {
              uploadEvent.preventDefault();
              const file = fileInput.files && fileInput.files[0];
              if (!file) return;
              if (file.size > 15 * 1024 * 1024 || file.size < 100 || (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'))) {
                uploadMessage.textContent = 'اختر ملف PDF صالحًا لا يتجاوز 15 ميغابايت.';
                uploadMessage.className = 'form-message error';
                return;
              }
              const trackingValues = new FormData(trackForm);
              const data = new FormData();
              data.append('request_ref', String(trackingValues.get('request_ref') || '').trim());
              data.append('phone', String(trackingValues.get('phone') || '').trim());
              data.append('file', file, file.name);
              uploadButton.disabled = true;
              uploadMessage.textContent = 'جارٍ رفع الملف بصورة آمنة…';
              uploadMessage.className = 'form-message';
              try {
                const response = await fetch('https://lfubzohsbwdoiagfkpkt.supabase.co/functions/v1/submit-join-file', {
                  method: 'POST',
                  headers: { 'apikey': 'sb_publishable_tCZjOnFHLIeQHF0mR9tVFA_9bu4lLrJ' },
                  body: data
                });
                const uploaded = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(uploaded.error || 'تعذر إيداع الملف.');
                uploadForm.hidden = true;
                uploadMessage.textContent = uploaded.message || 'تم استلام الملف.';
                uploadMessage.className = 'form-message success';
              } catch (uploadError) {
                uploadMessage.textContent = uploadError.message || 'تعذر إيداع الملف. حاول لاحقًا.';
                uploadMessage.className = 'form-message error';
              } finally {
                uploadButton.disabled = false;
              }
            });
            requirementBox.append(uploadForm);
          }
          requirementBox.hidden = false;
        } else {
          requirementBox.hidden = true;
        }
      }
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