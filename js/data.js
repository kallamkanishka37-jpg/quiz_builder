/* data.js — all localStorage access lives here so every page shares one source of truth. */

const QB_KEYS = {
  users: 'qb_users',
  session: 'qb_session',
  quizzes: 'qb_quizzes',
  results: 'qb_results'
};

function qbRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error('Could not read', key, e);
    return fallback;
  }
}

function qbWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* Seed a demo admin account once, so the Admin Module is reachable without a
   separate admin-signup flow. Everyone who signs up through the form becomes
   a "user". */
function qbSeed() {
  const users = qbRead(QB_KEYS.users, null);
  if (!users) {
    qbWrite(QB_KEYS.users, [
      { username: 'admin', password: 'admin123', name: 'Admin', role: 'admin' }
    ]);
  }
  if (!qbRead(QB_KEYS.quizzes, null)) qbWrite(QB_KEYS.quizzes, []);
  if (!qbRead(QB_KEYS.results, null)) qbWrite(QB_KEYS.results, []);
}
qbSeed();

/* ---------- users / auth ---------- */

function qbGetUsers() {
  return qbRead(QB_KEYS.users, []);
}

function qbSignup(username, password, name) {
  const users = qbGetUsers();
  if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return { ok: false, error: 'That username is already taken.' };
  }
  users.push({ username, password, name, role: 'user' });
  qbWrite(QB_KEYS.users, users);
  return { ok: true };
}

function qbLogin(username, password) {
  const user = qbGetUsers().find(
    u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
  );
  if (!user) return { ok: false, error: 'Wrong username or password.' };
  qbWrite(QB_KEYS.session, { username: user.username, name: user.name, role: user.role });
  return { ok: true, user };
}

function qbLogout() {
  localStorage.removeItem(QB_KEYS.session);
}

function qbCurrentUser() {
  return qbRead(QB_KEYS.session, null);
}

/* Call at the top of admin.html / user.html to enforce access per role. */
function qbRequireRole(role) {
  const session = qbCurrentUser();
  if (!session || session.role !== role) {
    window.location.href = 'index.html';
  }
  return session;
}

/* ---------- quizzes ---------- */

function qbGetQuizzes() {
  return qbRead(QB_KEYS.quizzes, []);
}

function qbGetQuiz(id) {
  return qbGetQuizzes().find(q => q.id === id) || null;
}

function qbSaveQuiz(quiz) {
  const quizzes = qbGetQuizzes();
  const idx = quizzes.findIndex(q => q.id === quiz.id);
  if (idx >= 0) quizzes[idx] = quiz;
  else quizzes.push(quiz);
  qbWrite(QB_KEYS.quizzes, quizzes);
}

function qbDeleteQuiz(id) {
  qbWrite(QB_KEYS.quizzes, qbGetQuizzes().filter(q => q.id !== id));
  qbWrite(QB_KEYS.results, qbGetResults().filter(r => r.quizId !== id));
}

/* ---------- results ---------- */

function qbGetResults() {
  return qbRead(QB_KEYS.results, []);
}

function qbSaveResult(result) {
  const results = qbGetResults();
  results.push(result);
  qbWrite(QB_KEYS.results, results);
}

function qbResultsForQuiz(quizId) {
  return qbGetResults()
    .filter(r => r.quizId === quizId)
    .sort((a, b) => (b.score / b.total) - (a.score / a.total) || a.timeTakenSec - b.timeTakenSec);
}

function qbResultsForUser(username) {
  return qbGetResults().filter(r => r.username === username);
}

function qbUid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function qbShuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
