/**
 * Local certificate manager (admin.html). Talks to the local-only API in scripts/server.js:
 *   GET    /api/certificates        -> { certificates: [...] }
 *   POST   /api/certificates        -> create (JSON body with fileName + fileBase64 data URL)
 *   PUT    /api/certificates/:id    -> update (file optional)
 *   DELETE /api/certificates/:id    -> remove record and its files
 */
(() => {
  const { html, render } = window.PageUtils;
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const LABEL_SAVE = 'Сохранить сертификат';
  const LABEL_SAVE_CHANGES = 'Сохранить изменения';

  const byId = id => document.getElementById(id);
  const form = byId('certForm');
  const saveButton = byId('saveCert');
  const cancelButton = byId('cancelEdit');
  const messageBox = byId('adminMessage');
  const listRoot = byId('adminCertList');
  let records = [];

  /* ---------- feedback ---------- */

  function message(text, state = 'info') {
    if (!messageBox) return;
    messageBox.textContent = text;
    messageBox.dataset.state = text ? state : '';
  }

  function setBusy(isBusy) {
    form.setAttribute('aria-busy', String(isBusy));
    saveButton.disabled = isBusy;
    cancelButton.disabled = isBusy;
    listRoot.querySelectorAll('button').forEach(button => { button.disabled = isBusy; });
  }

  /* ---------- API ---------- */

  async function api(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    let data = {};
    try {
      data = await response.json();
    } catch (_) {
      data = {};
    }
    if (!response.ok) throw new Error(data.error || 'Ошибка запроса');
    return data;
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ---------- form ---------- */

  function clearForm() {
    form.reset();
    byId('certId').value = '';
    cancelButton.hidden = true;
    saveButton.textContent = LABEL_SAVE;
  }

  function editRecord(cert) {
    if (!cert) return;
    byId('certId').value = cert.id;
    byId('certTitle').value = cert.title || '';
    byId('certIssuer').value = cert.issuer || '';
    byId('certCategory').value = cert.category || 'projects';
    byId('certDate').value = cert.date || cert.year || '';
    byId('certAward').value = cert.award || '';
    byId('certSkills').value = (cert.skills || []).join(', ');
    byId('certDescription').value = cert.description || '';
    cancelButton.hidden = false;
    saveButton.textContent = LABEL_SAVE_CHANGES;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    byId('certTitle').focus({ preventScroll: true });
  }

  function collectPayload() {
    return {
      title: byId('certTitle').value.trim(),
      issuer: byId('certIssuer').value.trim(),
      category: byId('certCategory').value,
      date: byId('certDate').value.trim(),
      award: byId('certAward').value.trim(),
      skills: byId('certSkills').value.split(',').map(skill => skill.trim()).filter(Boolean),
      description: byId('certDescription').value.trim()
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const id = byId('certId').value;
    const file = byId('certFile').files[0];
    if (!id && !file) {
      message('Выберите изображение или PDF сертификата.', 'error');
      byId('certFile').focus();
      return;
    }
    if (file && file.size > MAX_FILE_SIZE) {
      message('Максимальный размер файла — 10 МБ.', 'error');
      byId('certFile').focus();
      return;
    }

    const payload = collectPayload();
    setBusy(true);
    message('');
    try {
      if (file) {
        payload.fileName = file.name;
        payload.fileBase64 = await readFileAsDataURL(file);
      }
      await api(id ? '/api/certificates/' + encodeURIComponent(id) : '/api/certificates', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });
      message('Изменения сохранены в файлах сайта. Опубликуйте обновлённую версию, чтобы они появились на сайте.', 'success');
      clearForm();
      await loadList();
    } catch (error) {
      message(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  /* ---------- list ---------- */

  function recordTemplate(cert, index) {
    const titleId = `admin-cert-${index}`;
    return html`
      <article class="experience-entry admin-cert">
        <strong id="${titleId}">${cert.title}</strong>
        <p>${cert.issuer} · ${cert.year || ''}</p>
        <div class="detail-actions">
          <button type="button" class="btn btn-sm btn-secondary" data-edit="${cert.id}" aria-describedby="${titleId}">Изменить</button>
          <button type="button" class="btn btn-sm btn-secondary" data-delete="${cert.id}" aria-describedby="${titleId}">Удалить</button>
        </div>
      </article>`;
  }

  function renderList() {
    render(listRoot, records.map(recordTemplate));
  }

  async function deleteRecord(id) {
    if (!confirm('Удалить сертификат и его файл из проекта?')) return;
    setBusy(true);
    try {
      await api('/api/certificates/' + encodeURIComponent(id), { method: 'DELETE' });
      await loadList();
    } catch (error) {
      message(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function loadList() {
    const data = await api('/api/certificates');
    records = Array.isArray(data.certificates) ? data.certificates : [];
    renderList();
  }

  /* ---------- wiring ---------- */

  cancelButton.addEventListener('click', clearForm);
  form.addEventListener('submit', handleSubmit);
  listRoot.addEventListener('click', event => {
    const button = event.target instanceof Element ? event.target.closest('button[data-edit], button[data-delete]') : null;
    if (!button || button.disabled) return;
    if (button.dataset.edit !== undefined) {
      editRecord(records.find(cert => cert.id === button.dataset.edit));
    } else {
      deleteRecord(button.dataset.delete);
    }
  });

  loadList().catch(() => message('Не удалось подключиться. Запустите локальный сервер командой npm start.', 'error'));
})();
