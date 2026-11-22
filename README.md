# Week 3 Math Quiz

A functional **static website** for teacher-controlled, independent classroom quizzes. There are **three horizontal panels** in this exact order: **Fitri (red)**, **Salsa (green)**, **Mandala (blue)**.

## Quick start

1. Open `index.html` in Chrome or Edge to use it **offline**, without installing anything.
2. Print the separate **Math Quiz Answer Sheets PDF** (one sheet per student) from your **private teacher pack**.
3. If you want music, choose an audio file under **Teacher controls → Session**, or add your own licensed `music.mp3` inside `assets/`.
4. Click the timer to start **15:00**. Click **Next** separately for each child whenever they finish.
5. Children write the **question ID and answer** on paper, e.g. `F-014 | 36`. Scratch work goes on separate blank A4 paper.
6. After the timer ends, use the **separate teacher answer key** (never put it on the public site). Open **Teacher controls → Team score** to enter each student's number attempted and number correct.

## Website features

- No logins, backend, API, downloads, dependency installations, or build commands.
- **90 fixed, verified problems:** 30 per student. Questions are **shuffled, not generated** at quiz time.
- Stable ID (`F-001` through `F-030`; `S-001` through `S-030`; `M-001` through `M-030`) no matter where a question appears.
- **Guided shuffle** (default) provides balanced starting difficulties; **fully random** is optional from teacher settings, effective at the next new session.
- Teacher-only independent Previous and Next for each student. 30th question stops navigation.
- Accurate 15-minute timer with start, pause/resume, reset, end lock, optional teacher override.
- Optional local music with volume control (no auto play, no included third-party audio).
- Session saved in **browser localStorage**, so refreshing keeps the question order, positions, and teacher scores. Timer continues using wall-clock time if refreshed while running.
- Default team target **23 correct** (more than 75% of an initial 10 questions × 3 children), plus default **5 correct per child**. Extra answered questions can contribute to team total. All thresholds editable.
- Export question order CSV, teacher scores CSV. Private teacher PDF/CSV answer keys are **not** in this public website ZIP.
- Keyboard shortcuts: `1`/`2`/`3` Next for Fitri/Salsa/Mandala; `Shift+1/2/3` Previous; `Space` Start/Pause timer; `F` Fullscreen.
- Works as a local `file://` webpage or via GitHub Pages with relative asset paths. No internet connection required after you have the files.

### Important: teacher and child privacy

- If you make this repository **public**, the first names and questions in the source files will be public. To avoid public real names, change `DEFAULT_NAMES` in `app.js` and initial labels in `index.html` before uploading, then customize names locally when teaching.
- Do **not** publish the private teacher pack, student response sheets, individual scores, personal information, or identifiable class photos.
- This site does not transmit student answers or scores anywhere; score entries stay in the browser's local storage.
- This isn't an access-controlled teacher portal: anyone viewing the public site may open the Settings panel. No solutions are included in the public JS files.

## Deploy to GitHub Pages

1. Create a new public GitHub repository, such as `week3-math-quiz`.
2. Upload the **contents** of this ZIP directly to the repository **root** (`index.html`, `styles.css`, `app.js`, `questions.js`, `assets/`, etc.). Do **not** upload the ZIP alone or nest everything in another folder.
3. Open repository **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**.
5. Select `main`, `/(root)`, then **Save**.
6. Once published, visit `https://YOUR_USERNAME.github.io/week3-math-quiz/` (replace account and repository).

The same site works when opening `index.html` directly from your extracted folder (no server needed). If your repository is public, GitHub Pages is free within GitHub's applicable limits.

## Music

To add public-deployed music, put an audio file named exactly `assets/music.mp3` in the repository before publishing. Only upload music that you have permission to distribute publicly. **Simpler and safer:** keep your music as a file on the laptop, open the site's teacher settings, and choose the file locally. Selecting a local file does not upload it, but it must be chosen again after a full page reload.

## Structure

- `index.html` — classroom UI, teacher controls, score entry.
- `styles.css` — responsive styling.
- `questions.js` — question bank (NO answers).
- `app.js` — timer, independent navigation, shuffle logic, local persistence, music, scoring.
- `assets/favicon.svg` — small UI icon.
- `.nojekyll` — instruct GitHub Pages to skip Jekyll processing.

**Do not upload `Week3_Math_Quiz_Private` or the private teacher ZIP to GitHub.**
