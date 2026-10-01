/* admin.js — powers admin.html. */

const session = qbRequireRole('admin');
let questionDraft = []; // [{id, type, text, options:[], correctIndex, correctBool, sampleAnswer}]

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('who-name').textContent = `${session.name} (admin)`;
  document.getElementById('logout-btn').addEventListener('click', () => {
    qbLogout();
    window.location.href = 'index.html';
  });

  setupNav();
  renderQuizList();
  populateReportSelect();

  document.getElementById('add-mcq').addEventListener('click', () => addQuestionDraft('mcq'));
  document.getElementById('add-tf').addEventListener('click', () => addQuestionDraft('tf'));
  document.getElementById('add-open').addEventListener('click', () => addQuestionDraft('open'));
  document.getElementById('save-quiz-btn').addEventListener('click', saveQuiz);
  document.getElementById('cancel-edit-btn').addEventListener('click', resetBuilder);
  document.getElementById('report-select').addEventListener('change', renderReport);
});

/* ---------- navigation between the three module screens ---------- */
function setupNav() {
  const tabs = document.querySelectorAll('.tab-link[data-view]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById(tab.dataset.view).classList.add('active');
      if (tab.dataset.view === 'view-quizzes') renderQuizList();
      if (tab.dataset.view === 'view-reports') { populateReportSelect(); renderReport(); }
    });
  });
}

function goToView(id) {
  document.querySelectorAll('.tab-link[data-view]').forEach(t =>
    t.classList.toggle('active', t.dataset.view === id));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === id));
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- quiz list ---------- */
function renderQuizList() {
  const list = document.getElementById('quiz-list');
  const quizzes = qbGetQuizzes().filter(q => q.createdBy === session.username);
  if (quizzes.length === 0) {
    list.innerHTML = `<div class="empty-state">You haven't published a quiz yet. Use "Create quiz" to build your first one.</div>`;
    return;
  }
  list.innerHTML = quizzes.map(q => {
    const results = qbResultsForQuiz(q.id);
    return `
      <div class="quiz-item diff-${q.difficulty}">
        <div class="row">
          <h3>${escapeHtml(q.title)}</h3>
          <span class="pill">${q.difficulty}</span>
        </div>
        <p style="margin:0">${escapeHtml(q.description || 'No description.')}</p>
        <div class="meta">
          <span>${q.questions.length} question${q.questions.length === 1 ? '' : 's'}</span>
          <span>${results.length} attempt${results.length === 1 ? '' : 's'}</span>
          <span>${q.category ? escapeHtml(q.category) : 'Uncategorized'}</span>
        </div>
        <div class="actions">
          <button class="btn secondary" onclick="editQuiz('${q.id}')">Edit</button>
          <button class="btn danger" onclick="removeQuiz('${q.id}')">Delete</button>
        </div>
      </div>`;
  }).join('');
}

function removeQuiz(id) {
  if (!confirm('Delete this quiz and all its results? This cannot be undone.')) return;
  qbDeleteQuiz(id);
  renderQuizList();
  populateReportSelect();
  toast('Quiz deleted.');
}

function editQuiz(id) {
  const quiz = qbGetQuiz(id);
  if (!quiz) return;
  document.getElementById('builder-heading').textContent = 'Edit quiz';
  document.getElementById('q-edit-id').value = quiz.id;
  document.getElementById('q-title').value = quiz.title;
  document.getElementById('q-category').value = quiz.category || '';
  document.getElementById('q-description').value = quiz.description || '';
  document.getElementById('q-difficulty').value = quiz.difficulty;
  document.getElementById('q-randomize').value = String(!!quiz.randomize);
  questionDraft = JSON.parse(JSON.stringify(quiz.questions));
  document.getElementById('cancel-edit-btn').style.display = 'inline-flex';
  renderQuestionDraft();
  goToView('view-builder');
}

function resetBuilder() {
  document.getElementById('builder-heading').textContent = 'Create a quiz';
  document.getElementById('q-edit-id').value = '';
  document.getElementById('q-title').value = '';
  document.getElementById('q-category').value = '';
  document.getElementById('q-description').value = '';
  document.getElementById('q-difficulty').value = 'medium';
  document.getElementById('q-randomize').value = 'false';
  document.getElementById('builder-error').textContent = '';
  document.getElementById('cancel-edit-btn').style.display = 'none';
  questionDraft = [];
  renderQuestionDraft();
}

/* ---------- question builder ---------- */
function addQuestionDraft(type) {
  const base = { id: qbUid(), type, text: '' };
  if (type === 'mcq') { base.options = ['', '']; base.correctIndex = 0; }
  if (type === 'tf') { base.correctBool = true; }
  if (type === 'open') { base.sampleAnswer = ''; }
  questionDraft.push(base);
  renderQuestionDraft();
}

function renderQuestionDraft() {
  const container = document.getElementById('question-list');
  if (questionDraft.length === 0) {
    container.innerHTML = `<div class="empty-state">No questions yet — add a multiple choice, true/false, or open-ended question below.</div>`;
    return;
  }
  container.innerHTML = questionDraft.map((q, i) => {
    let body = '';
    if (q.type === 'mcq') {
      body = `
        <div class="helper">Multiple choice — mark the correct option</div>
        ${q.options.map((opt, oi) => `
          <div class="option-row">
            <input type="radio" name="correct-${q.id}" ${oi === q.correctIndex ? 'checked' : ''}
              onchange="setDraftField('${q.id}', 'correctIndex', ${oi})">
            <input type="text" value="${escapeAttr(opt)}" placeholder="Option ${oi + 1}"
              oninput="setOptionText('${q.id}', ${oi}, this.value)">
            ${q.options.length > 2 ? `<button class="btn secondary" onclick="removeOption('${q.id}', ${oi})">Remove</button>` : ''}
          </div>`).join('')}
        <button class="btn secondary" style="margin-top:0.5rem" onclick="addOption('${q.id}')">+ Add option</button>`;
    } else if (q.type === 'tf') {
      body = `
        <div class="helper">True / False — mark the correct answer</div>
        <div class="option-row">
          <label style="display:flex;align-items:center;gap:0.4rem;margin:0">
            <input type="radio" name="tf-${q.id}" ${q.correctBool ? 'checked' : ''} onchange="setDraftField('${q.id}', 'correctBool', true)"> True
          </label>
          <label style="display:flex;align-items:center;gap:0.4rem;margin:0">
            <input type="radio" name="tf-${q.id}" ${!q.correctBool ? 'checked' : ''} onchange="setDraftField('${q.id}', 'correctBool', false)"> False
          </label>
        </div>`;
    } else {
      body = `
        <div class="helper">Open-ended — graded by keyword match against your sample answer</div>
        <label for="sample-${q.id}">Sample / keyword answer</label>
        <input type="text" id="sample-${q.id}" value="${escapeAttr(q.sampleAnswer)}"
          oninput="setDraftField('${q.id}', 'sampleAnswer', this.value)">`;
    }
    return `
      <div class="q-block">
        <div class="row">
          <span class="pill">${i + 1} · ${typeLabel(q.type)}</span>
          <button class="btn secondary" onclick="removeQuestion('${q.id}')">Remove question</button>
        </div>
        <label>Question text</label>
        <textarea oninput="setDraftField('${q.id}', 'text', this.value)">${escapeHtml(q.text)}</textarea>
        ${body}
      </div>`;
  }).join('');
}

function typeLabel(t) {
  return t === 'mcq' ? 'Multiple choice' : t === 'tf' ? 'True / False' : 'Open-ended';
}

function findDraft(id) { return questionDraft.find(q => q.id === id); }

function setDraftField(id, field, value) {
  const q = findDraft(id);
  if (q) q[field] = value;
  if (field === 'correctIndex' || field === 'correctBool') return; // no re-render needed
  // text inputs re-render only on blur-worthy changes; skip full re-render to keep caret position
}

function setOptionText(id, index, value) {
  const q = findDraft(id);
  if (q) q.options[index] = value;
}

function addOption(id) {
  const q = findDraft(id);
  if (q) { q.options.push(''); renderQuestionDraft(); }
}

function removeOption(id, index) {
  const q = findDraft(id);
  if (q && q.options.length > 2) {
    q.options.splice(index, 1);
    if (q.correctIndex >= q.options.length) q.correctIndex = 0;
    renderQuestionDraft();
  }
}

function removeQuestion(id) {
  questionDraft = questionDraft.filter(q => q.id !== id);
  renderQuestionDraft();
}

/* ---------- save ---------- */
function saveQuiz() {
  const errorEl = document.getElementById('builder-error');
  const title = document.getElementById('q-title').value.trim();
  if (!title) { errorEl.textContent = 'Give the quiz a title.'; return; }
  if (questionDraft.length === 0) { errorEl.textContent = 'Add at least one question.'; return; }
  for (const q of questionDraft) {
    if (!q.text.trim()) { errorEl.textContent = 'Every question needs its text filled in.'; return; }
    if (q.type === 'mcq' && q.options.some(o => !o.trim())) {
      errorEl.textContent = 'Fill in every option, or remove the empty one.';
      return;
    }
  }
  errorEl.textContent = '';

  const editId = document.getElementById('q-edit-id').value;
  const quiz = {
    id: editId || qbUid(),
    title,
    category: document.getElementById('q-category').value.trim(),
    description: document.getElementById('q-description').value.trim(),
    difficulty: document.getElementById('q-difficulty').value,
    randomize: document.getElementById('q-randomize').value === 'true',
    questions: questionDraft,
    createdBy: session.username,
    createdAt: editId ? qbGetQuiz(editId).createdAt : Date.now()
  };
  qbSaveQuiz(quiz);
  toast(editId ? 'Quiz updated.' : 'Quiz published.');
  resetBuilder();
  populateReportSelect();
  goToView('view-quizzes');
  renderQuizList();
}

/* ---------- reports ---------- */
function populateReportSelect() {
  const select = document.getElementById('report-select');
  const quizzes = qbGetQuizzes().filter(q => q.createdBy === session.username);
  const current = select.value;
  select.innerHTML = quizzes.map(q => `<option value="${q.id}">${escapeHtml(q.title)}</option>`).join('');
  if (quizzes.some(q => q.id === current)) select.value = current;
  renderReport();
}

function renderReport() {
  const body = document.getElementById('report-body');
  const select = document.getElementById('report-select');
  const quizId = select.value;
  if (!quizId) {
    body.innerHTML = `<div class="empty-state">Publish a quiz to start collecting results.</div>`;
    return;
  }
  const results = qbResultsForQuiz(quizId);
  if (results.length === 0) {
    body.innerHTML = `<div class="empty-state">No one has taken this quiz yet.</div>`;
    return;
  }
  const avg = Math.round(results.reduce((s, r) => s + (r.score / r.total), 0) / results.length * 100);
  const best = Math.round(Math.max(...results.map(r => r.score / r.total)) * 100);
  body.innerHTML = `
    <div class="stat-row">
      <div class="stat"><div class="num">${results.length}</div><div class="label">Attempts</div></div>
      <div class="stat"><div class="num">${avg}%</div><div class="label">Average score</div></div>
      <div class="stat"><div class="num">${best}%</div><div class="label">Top score</div></div>
    </div>
    <table class="leaderboard">
      <thead><tr><th>Rank</th><th>Name</th><th>Score</th><th>Time taken</th></tr></thead>
      <tbody>
        ${results.map((r, i) => `
          <tr>
            <td>#${i + 1}</td>
            <td>${escapeHtml(r.name || r.username)}</td>
            <td>${r.score} / ${r.total}</td>
            <td>${formatSecs(r.timeTakenSec)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function formatSecs(s) {
  if (!s && s !== 0) return '—';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function escapeAttr(str) { return escapeHtml(str); }
