/* auth.js — powers index.html only. */

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, skip straight to the right module.
  const existing = qbCurrentUser();
  if (existing) {
    window.location.href = existing.role === 'admin' ? 'admin.html' : 'user.html';
    return;
  }

  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const tagline = document.getElementById('tagline');

  function showLogin() {
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
    tagline.textContent = 'Sign in to build, share, and take quizzes.';
  }
  function showSignup() {
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    signupForm.style.display = 'block';
    loginForm.style.display = 'none';
    tagline.textContent = 'Create a free account to start taking quizzes.';
  }
  tabLogin.addEventListener('click', showLogin);
  tabSignup.addEventListener('click', showSignup);

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const result = qbLogin(username, password);
    if (!result.ok) {
      errorEl.textContent = result.error;
      return;
    }
    errorEl.textContent = '';
    window.location.href = result.user.role === 'admin' ? 'admin.html' : 'user.html';
  });

  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const username = document.getElementById('signup-username').value.trim();
    const password = document.getElementById('signup-password').value;
    const errorEl = document.getElementById('signup-error');

    if (!name || !username || password.length < 4) {
      errorEl.textContent = 'Fill every field; password needs at least 4 characters.';
      return;
    }
    const result = qbSignup(username, password, name);
    if (!result.ok) {
      errorEl.textContent = result.error;
      return;
    }
    errorEl.textContent = '';
    qbLogin(username, password);
    window.location.href = 'user.html';
  });
});
