/* user.js — powers user.html. */

const session = qbRequireRole('user');

let activeQuiz = null;
let activeOrder = [];      // questions, possibly shuffled
let activeIndex = 0;
let activeAnswers = [];    // parallel to activeOrder
let activeSelection = null; // current in-progress selection for mcq/tf
let quizStartedAt = 0;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('who-name').textContent = session.name;
  document.getElementById('logout-btn').addEventListener('click', () => {
    qbLogout();
    window.location.href = 'index.html';
  });

  setupNav();
  renderQuizList();

  document.getElementById('quit-quiz-btn').addEventListener('click', exitQuiz);
  document.getElementById('next-btn').addEventListener('click', handleNext);
  document.getElementById('back-to-dashboard-btn').addEventListener('click', () => {
    document.getElementById('score-shell').style.display = 'none';
    document.getElementById('dashboard-shell').style.display = 'grid';
    goToView('view-results');
    renderResults();
  });
});

function setupNav() {
  const tabs = document.querySelectorAll('.tab-link[data-view]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById(tab.dataset.view).classList.add('active');
      if (tab.dataset.view === 'view-results') renderResults();
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

/* ---------- browse ---------- */
function renderQuizList() {
  const list = document.getElementById('quiz-list');
  const quizzes = qbGetQuizzes();
  if (quizzes.length === 0) {
    list.innerHTML = `<div class="empty-state">No quizzes are published yet — check back soon.</div>`;
    return;
  }
  list.innerHTML = quizzes.map(q => {
    const myAttempts = qbResultsForUser(session.username).filter(r => r.quizId === q.id);
    return `
      <div class="quiz-item diff-${q.difficulty}">
        <div class="row">
          <h3>${escapeHtml(q.title)}</h3>
          <span class="pill">${q.difficulty}</span>
        </div>
        <p style="margin:0">${escapeHtml(q.description || 'No description.')}</p>
        <div class="meta">
          <span>${q.questions.length} question${q.questions.length === 1 ? '' : 's'}</span>
          <span>${q.category ? escapeHtml(q.category) : 'Uncategorized'}</span>
          ${myAttempts.length ? `<span>Best: ${Math.max(...myAttempts.map(a => a.score))}/${q.questions.length}</span>` : ''}
        </div>
        <div class="actions">
          <button class="btn" onclick="startQuiz('${q.id}')">${myAttempts.length ? 'Try again' : 'Start quiz'}</button>
        </div>
      </div>`;
  }).join('');
}

/* ---------- results ---------- */
function renderResults() {
  const body = document.getElementById('results-body');
  const results = qbResultsForUser(session.username).sort((a, b) => b.takenAt - a.takenAt);
  if (results.length === 0) {
    body.innerHTML = `<div class="empty-state">You haven't taken a quiz yet. Head to "Browse quizzes" to get started.</div>`;
    return;
  }
  body.innerHTML = `
    <table class="leaderboard">
      <thead><tr><th>Quiz</th><th>Score</th><th>Percent</th><th>Taken</th></tr></thead>
      <tbody>
        ${results.map(r => {
          const quiz = qbGetQuiz(r.quizId);
          const pct = Math.round((r.score / r.total) * 100);
          return `<tr>
            <td>${escapeHtml(quiz ? quiz.title : 'Deleted quiz')}</td>
            <td>${r.score} / ${r.total}</td>
            <td>${pct}%</td>
            <td>${new Date(r.takenAt).toLocaleString()}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

/* ---------- quiz taking (focus mode) ---------- */
function startQuiz(quizId) {
  const quiz = qbGetQuiz(quizId);
  if (!quiz || quiz.questions.length === 0) return;
  activeQuiz = quiz;
  activeOrder = quiz.randomize ? qbShuffle(quiz.questions) : quiz.questions.slice();
  activeIndex = 0;
  activeAnswers = new Array(activeOrder.length).fill(null);
  quizStartedAt = Date.now();

  document.getElementById('dashboard-shell').style.display = 'none';
  document.getElementById('focus-shell').style.display = 'flex';
  renderQuestion();
}

function exitQuiz() {
  if (!confirm('Exit this quiz? Your progress will not be saved.')) return;
  document.getElementById('focus-shell').style.display = 'none';
  document.getElementById('dashboard-shell').style.display = 'grid';
}

function renderQuestion() {
  const q = activeOrder[activeIndex];
  activeSelection = activeAnswers[activeIndex];

  document.getElementById('progress-fill').style.width =
    `${Math.round((activeIndex / activeOrder.length) * 100)}%`;
  document.getElementById('q-count').textContent = `Question ${activeIndex + 1} of ${activeOrder.length}`;
  document.getElementById('q-text').textContent = q.text;

  const area = document.getElementById('q-answer-area');
  if (q.type === 'mcq') {
    area.innerHTML = q.options.map((opt, i) => `
      <button type="button" class="option-btn ${activeSelection === i ? 'selected' : ''}" onclick="selectOption(${i})">
        ${escapeHtml(opt)}
      </button>`).join('');
  } else if (q.type === 'tf') {
    area.innerHTML = ['True', 'False'].map((label, i) => {
      const val = i === 0; // true, false
      return `<button type="button" class="option-btn ${activeSelection === val ? 'selected' : ''}" onclick="selectOption(${val})">${label}</button>`;
    }).join('');
  } else {
    area.innerHTML = `<textarea id="open-answer" rows="4" placeholder="Type your answer...">${escapeHtml(activeSelection || '')}</textarea>`;
  }

  document.getElementById('next-btn').textContent =
    activeIndex === activeOrder.length - 1 ? 'Finish quiz' : 'Next';
}

function selectOption(value) {
  activeSelection = value;
  activeAnswers[activeIndex] = value;
  renderQuestion();
}

function handleNext() {
  const q = activeOrder[activeIndex];
  if (q.type === 'open') {
    activeAnswers[activeIndex] = document.getElementById('open-answer').value.trim();
  } else if (activeAnswers[activeIndex] === null) {
    toast('Pick an answer before continuing.');
    return;
  }

  if (activeIndex < activeOrder.length - 1) {
    activeIndex++;
    renderQuestion();
  } else {
    finishQuiz();
  }
}

function finishQuiz() {
  let score = 0;
  activeOrder.forEach((q, i) => {
    const ans = activeAnswers[i];
    if (q.type === 'mcq' && ans === q.correctIndex) score++;
    else if (q.type === 'tf' && ans === q.correctBool) score++;
    else if (q.type === 'open' && gradeOpen(ans, q.sampleAnswer)) score++;
  });

  const timeTakenSec = Math.round((Date.now() - quizStartedAt) / 1000);
  const result = {
    id: qbUid(),
    quizId: activeQuiz.id,
    username: session.username,
    name: session.name,
    score,
    total: activeOrder.length,
    takenAt: Date.now(),
    timeTakenSec
  };
  qbSaveResult(result);

  document.getElementById('focus-shell').style.display = 'none';
  document.getElementById('score-shell').style.display = 'flex';
  document.getElementById('score-quiz-title').textContent = activeQuiz.title;
  document.getElementById('score-num').textContent = `${score} / ${activeOrder.length}`;
  const pct = Math.round((score / activeOrder.length) * 100);
  document.getElementById('score-detail').textContent =
    `You scored ${pct}%, in ${formatSecs(timeTakenSec)}.`;

  const board = qbResultsForQuiz(activeQuiz.id).slice(0, 10);
  document.getElementById('score-leaderboard').innerHTML = `
    <thead><tr><th>Rank</th><th>Name</th><th>Score</th></tr></thead>
    <tbody>
      ${board.map((r, i) => `
        <tr style="${r.id === result.id ? 'font-weight:700;color:var(--primary)' : ''}">
          <td>#${i + 1}</td><td>${escapeHtml(r.name || r.username)}</td><td>${r.score} / ${r.total}</td>
        </tr>`).join('')}
    </tbody>`;
}

/* Very simple open-ended grading: correct if the answer shares enough
   keywords with the sample/keyword answer the admin provided. */
function gradeOpen(answer, sample) {
  if (!answer || !sample) return false;
  const norm = s => s.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  const sampleWords = new Set(norm(sample));
  if (sampleWords.size === 0) return false;
  const answerWords = new Set(norm(answer));
  let hits = 0;
  sampleWords.forEach(w => { if (answerWords.has(w)) hits++; });
  return hits / sampleWords.size >= 0.5;
}

function formatSecs(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
