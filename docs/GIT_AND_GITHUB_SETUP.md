# Git and GitHub setup (Windows, new GitHub account)

Goal: keep everything in a local git repository; publish to GitHub **only** versions whose
automated tests pass; serve the site free with GitHub Pages. Private files (`_internal/`) stay
on your computer.

## 1. Install tools (once)

1. **Git for Windows** — <https://git-scm.com/download/win>. Defaults are fine; it includes
   *Git Credential Manager*, which handles GitHub login in your browser.
2. **Node.js LTS** — <https://nodejs.org>.
3. Check, in Command Prompt:
   ```bat
   git --version
   node --version
   npm --version
   ```

## 2. Create the GitHub account and the empty repository

1. Sign up at <https://github.com/signup>. Turn on two-factor authentication (Settings → Password and authentication).
2. Privacy (recommended): Settings → Emails → tick **Keep my email addresses private**. Note the
   address shown, of the form `12345678+USERNAME@users.noreply.github.com`.
3. Create the repository: **+** (top right) → **New repository**
   - Name: `mathematica-web-ports` (any name; it becomes part of the URL)
   - **Public** (GitHub Pages is free for public repositories)
   - Do **not** add a README, .gitignore or licence (the project already has them).
4. Leave the page open; it shows the repository URL `https://github.com/USERNAME/mathematica-web-ports.git`.

## 3. Create the local repository

Unzip the project to e.g. `C:\Users\<you>\Projects\mathematica-web-ports`, then in Command Prompt:

```bat
cd %USERPROFILE%\Projects\mathematica-web-ports

git config --global user.name "Your Name"
git config --global user.email "12345678+USERNAME@users.noreply.github.com"
git config --global init.defaultBranch main
git config --global core.autocrlf true

git init
git add .
git status
```

**Check the `git status` list before committing:** nothing under `_internal/`, `node_modules/` or
`test-output/` may appear. (`.gitignore` excludes them.) Then:

```bat
git commit -m "First version of the three ports, tests and docs"
git remote add origin https://github.com/USERNAME/mathematica-web-ports.git
```

## 4. Install test tools and publish the first tested version

```bat
npm install
npx playwright install firefox
npm run publish:tested
```

If `npm install` changed `package-lock.json` (different npm version), commit that first:
`git add package-lock.json && git commit -m "Update lock file"`.

`publish:tested` (`tools/publish-tested.mjs`) refuses to publish if private files are tracked or
there are uncommitted changes, runs the unit/golden tests and the Firefox browser tests, and only if
everything passes creates a tag `tested-YYYYMMDD-HHMM` and pushes the branch and the tag. The first
push opens a browser window to log in to GitHub (Git Credential Manager).

Use `npm run publish:tested -- --dry` to run all checks without pushing.

> If the Firefox tests fail on the first run, do **not** push "anyway": the failure is a finding.
> Record it (_internal/assignment/REPORT_TRACKER.md), then decide whether to fix it. To publish a
> version that is known to fail some tests (e.g. to show a faulty AI conversion), push explicitly
> with `git push origin main` and say so in the commit message.

## 5. Turn on GitHub Pages (once)

Repository → **Settings** → **Pages** → *Build and deployment* → Source **Deploy from a branch** →
Branch **main**, folder **/ (root)** → **Save**. After a minute the site is at

`https://USERNAME.github.io/mathematica-web-ports/` — for this project:
<https://ticohannan.github.io/mathematica-web-ports/>

(The repository contains an empty `.nojekyll` file so GitHub serves all files as they are.)

## 6. Everyday workflow

```bat
:: edit files, then
npm test                         :: quick check
git add -A
git status                       :: review what will be committed
git commit -m "Describe the change"
npm run publish:tested           :: tests + tag + push, only if all pass
```

Useful:
```bat
git log --oneline --decorate -10     :: history with tags
git tag --list "tested-*"            :: versions that passed all tests
git diff                             :: what changed since the last commit
git switch --detach tested-20261002-1830   :: look at an old tested version (git switch main to return)
```

## 7. Private files (`_internal/`)

`_internal/` holds the notes shared with Claude (RULES, CHANGELOG, OBSERVATIONS, …), assignment
material and the original notebooks. It is ignored by the main repository. To version it **locally**
(never pushed), make it its own repository:

```bat
cd _internal
git init
git add .
git commit -m "Internal notes"
cd ..
```

Never add a remote to that inner repository unless you decide to (e.g. a private GitHub repository).

## 8. Working with a collaborator

- Simplest: email `docs/MANUAL_TEST_CHECKLIST.md`; they return a filled copy; save it in
  `_internal/test-runs/`.
- If they should push code: repository → Settings → Collaborators → Add people.
