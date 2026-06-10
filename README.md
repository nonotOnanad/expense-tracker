# Clarity — Expense Tracker

A clean, fast expense tracker with a dashboard, transaction history, spending
analysis with auto-generated insights, and category budgets. Built with
plain HTML/CSS/JS (no build step) and [Supabase](https://supabase.com) for
authentication and per-user data storage.

Each user logs in with their own account and can only ever see their own
expenses and budgets — enforced at the database level with Row Level
Security (RLS), not just in the UI.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com), sign up, and create a new project.
2. Wait for the project to finish provisioning.
3. Open **SQL Editor** in the left sidebar, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and click **Run**.
   This creates the `expenses` and `budgets` tables with Row Level
   Security policies so each user can only access their own rows.
4. Open **Project Settings → API**. You'll need:
   - **Project URL**
   - **anon / public** API key

   These are safe to use in client-side code — RLS is what actually
   protects each user's data.
5. (Optional but recommended for quick testing) Go to
   **Authentication → Providers → Email** and turn off **Confirm email**,
   so new accounts can log in immediately without verifying an email
   address. Leave it on for a more production-ready setup.

## 2. Configure the app

Open [`js/supabase-config.js`](js/supabase-config.js) and replace the two
placeholder values with the **Project URL** and **anon public key** from
step 1:

```js
const SUPABASE_URL = "https://xxxxxxxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJ...";
```

## 3. Run it locally

No build step needed — just open `index.html` in a browser, or serve the
folder with any static file server.

## 4. Deploy with GitHub Pages

1. Push this repository to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a
   branch**, choose the `main` branch and `/ (root)` folder, then save.
4. After a minute, your app will be live at
   `https://<your-username>.github.io/<repo-name>/`.

## How data isolation works

- `expenses` and `budgets` tables both have a `user_id` column that
  defaults to `auth.uid()`.
- Row Level Security policies restrict every `select` / `insert` /
  `update` / `delete` to rows where `user_id = auth.uid()`.
- The Supabase JS client automatically attaches the logged-in user's
  session token to every request, so the database enforces isolation
  regardless of what the frontend code does.

## Project structure

```
index.html              Markup (auth screen + app shell)
style.css               All styling, including light/dark themes
js/supabase-config.js   Supabase URL/key + client init
js/data.js              Categories, theme, and Supabase CRUD calls
js/auth.js              Login/signup/logout + session handling
js/utils.js             Date/number formatting and aggregation helpers
js/charts.js            Custom SVG bar/donut chart rendering
js/app.js               UI wiring, rendering, and event handlers
supabase/schema.sql      Database schema + RLS policies
```
