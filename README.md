# QuizBuilder

A browser-based quiz builder for education, training, or just-for-fun trivia — built with
plain HTML, CSS, and JavaScript, with no backend and no frameworks. All data lives in the
browser's `localStorage`.

## 1. Problem statement

Teachers, trainers, and quiz hosts need a fast way to write a quiz, share it, and see how
people did — without standing up a server or paying for a SaaS tool. QuizBuilder lets an
**admin** author quizzes (multiple-choice, true/false, and open-ended questions, with
optional randomized ordering) and lets any **signed-up user** browse the published quizzes,
take them in a focused one-question-at-a-time view, and see their score alongside a
leaderboard of everyone else who has attempted the same quiz.

## 2. Business system & modules

| Module | Who uses it | What it does |
|---|---|---|
| **Admin module** (`admin.html`) | The seeded admin account | Create/edit/delete quizzes, add MCQ / True-False / Open-ended questions, set difficulty and category, choose fixed vs. randomized question order, and view per-quiz reports (attempt count, average/top score, full leaderboard). |
| **User module** (`user.html`) | Anyone who signs up | Browse all published quizzes, take a quiz in a distraction-free focus screen with a progress bar, get an instant score plus the quiz's leaderboard, and review a personal results history. |
| **Auth** (`index.html`) | Everyone | Sign up (creates a "user" account) and log in, backed entirely by `localStorage`. |

A demo admin account is seeded automatically the first time the app runs in a browser:

```
username: admin
password: admin123
```

Anyone who signs up through the form becomes a regular user — this keeps quiz authorship
limited to the admin account, matching a typical classroom/training setup.

## 3–7. How the requirements are met

- **HTML/CSS/JS only** — no build step, no libraries, no dependencies. Open `index.html` in
  any modern browser and it works.
- **CSS Grid / Flexbox** — the dashboard shell (`.app-shell`), quiz card grid
  (`.card-grid`), and the two-column quiz-builder form (`.grid-2`) are all Grid/Flexbox;
  see `css/style.css`.
- **Signup/Login via Local Storage** — see `js/data.js` (`qbSignup`, `qbLogin`) and
  `js/auth.js`.
- **Module-wise navigation via JavaScript** — `admin.js`/`user.js` toggle `.view` sections
  and enforce role-based access with `qbRequireRole()`, redirecting anyone without the
  right role back to the login page.
- **All modules working** — quiz CRUD, quiz-taking with scoring (including a simple
  keyword-match grader for open-ended answers), and reporting are all implemented and
  exercised by hand-testing (see "Try it" below).

## File structure

```
quiz-builder/
├── index.html      # Login / signup
├── admin.html       # Admin module shell
├── user.html         # User module shell + quiz-taking focus mode
├── css/style.css      # Shared design system (Grid/Flexbox based)
└── js/
    ├── data.js         # Shared localStorage layer (users, quizzes, results)
    ├── auth.js          # index.html logic
    ├── admin.js          # admin.html logic
    └── user.js            # user.html logic
```

## Try it locally

No build tools needed — just serve the folder (opening `index.html` directly also works,
but a local server avoids browser file:// quirks):

```bash
cd quiz-builder
python3 -m http.server 8000
# then open http://localhost:8000
```

1. Log in as `admin` / `admin123`, go to **Create quiz**, and publish a quiz with a mix of
   question types.
2. Open the same URL in a new private/incognito window (or sign out), **sign up** as a
   normal user, and take the quiz from **Browse quizzes**.
3. Back in the admin tab, check **Reports** to see the attempt on the leaderboard.

## Push to GitHub

```bash
cd quiz-builder
git init
git add .
git commit -m "QuizBuilder: admin + user modules, localStorage auth, quiz taking"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

## Notes / known limitations

- Data is per-browser (`localStorage`), so it does not sync across devices — this is a
  deliberate trade-off for an HTML/CSS/JS-only, backend-free app.
- Passwords are stored in plain text in `localStorage` for demo purposes only; this is not
  meant for production use.
- Open-ended grading is a simple keyword-overlap heuristic, not real NLP grading.
