# PhD Atlas · Public Login Site

This repository contains **only the public web client** and the login interface for a single-owner PhD research workspace. It **does not** include journals, experiments, private recommendations, or service-role credentials.

Production site (after enabling Pages): https://hemol8433-cell.github.io/phd-atlas-site/

To publish: GitHub repository **Settings → Pages → Build and deployment → Source: Deploy from a branch**, choose `main` and `/docs`, then Save.

To finish OAuth, in the Supabase project Authentication → URL Configuration set **Site URL** to `https://hemol8433-cell.github.io/phd-atlas-site/` and add `https://hemol8433-cell.github.io/phd-atlas-site/index.html` to Redirect URLs.

The GitHub OAuth application Authorization callback URL remains `https://zsqbubjrjyycwduceoas.supabase.co/auth/v1/callback`. OAuth secrets must only be stored in the authentication provider dashboard. User data is protected by RLS in the private Supabase project; the source for this public client is not itself private.


## Personal life and file storage (2026-10-20)

- Main web application: `docs/app.html` (GitHub login required, private modules guarded).
- Visual refresh: `docs/personal-refresh.css` (light card dashboard, lemon accents, desktop icon rail).
- Life Space: `docs/life.js` — habits, personal diary, mood, daily rhythm, manual spending and tasks.
- Private Vault: `docs/vault.js` — files uploaded to the **non-public** `phd-atlas-private` Supabase Storage bucket.
- Storage rules: every object lives under `<auth.uid()>/uploads/<category>/...`, and only the configured GitHub owner can read/upload/delete it through verified Row Level Security policies.
- Max single file size: **25 MiB**. Supported: JPG, PNG, WebP, GIF, PDF, Word, Excel, PowerPoint, TXT, MD and CSV. Image and PDF previews are authenticated downloads; Word/Excel are downloadable.
- All main workspace and Life Space data is saved in `public.phd_workspace_state.document`, so it follows the same GitHub sign-in across devices once saved. Files are physically stored in Supabase Storage; their display names are in `document.vaultFiles`.
- Existing legacy PaperFlow browser-local bookmarks and notes are not automatically migrated.
- Exported PhD Atlas JSON backups contain text and metadata **but not binary uploaded files**. Download critical attachments separately.
- No banking connections or medical advice are provided; spending, sleep and mood values are manually entered.
- Browser-side upload/download with the owner's OAuth session has not been end-to-end tested in a real browser. Do not claim a successful live upload until tested.

The public repository contains only client code, publishable Supabase configuration and UI. It contains no private documents or server-side secrets.
