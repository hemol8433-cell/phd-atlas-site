# Suixu — new backend development branch

This branch targets the newly provisioned Supabase project.

- Project: `suixu`
- Project ref: `uoffmkyqigzrerqhxixm`
- Region: Singapore (`ap-southeast-1`)
- URL: `https://uoffmkyqigzrerqhxixm.supabase.co`
- Public client config: `docs/auth-config.js`
- Owner gate: GitHub provider ID `280190617` (`hemol8433-cell`)

## Included platform

The existing Suixu web client remains a static GitHub Pages application and includes:
- GitHub login gate
- research execution / ProjectDay
- personal life space
- private attachment vault
- literature queue
- weekly schedule board
- growth milestones and weekly review
- workspace JSON export/import

The app stores workspace state in `public.phd_workspace_state.document` and the private literature feed in `public.phd_private_papers.document`. File bytes live in the non-public `phd-atlas-private` Storage bucket.

## OAuth configuration

The GitHub OAuth App callback for this project is:
`https://uoffmkyqigzrerqhxixm.supabase.co/auth/v1/callback`

The expected Supabase Auth URL configuration is:
- Site URL: `https://hemol8433-cell.github.io/phd-atlas-site/`
- Redirect URL allow-list includes `https://hemol8433-cell.github.io/phd-atlas-site/index.html`

The owner previously reported that GitHub OAuth credentials and redirect settings were configured. The available management connection cannot independently read the provider secret or verify a real browser OAuth flow. The new project has no owner GitHub identity yet, so successful login, workspace writes, and file upload/download must not be described as verified until a real sign-in session has been used.

The OAuth Client Secret must only be stored in Supabase Auth Provider settings. Never commit it or expose a service-role/secret key to the browser.

## Database migrations and checked state

The two migrations in `supabase/migrations/` mirror migrations already applied to the live project. The project management connection reported both migration versions. Read-only inspection confirmed:
- `phd_workspace_state` and `phd_private_papers` have RLS enabled.
- workspace access is restricted to the authenticated owner policy.
- the `phd-atlas-private` Storage bucket is private, with a 25 MiB single-file limit and owner-path policies.
- Supabase security and performance advisors returned no lint findings at the time of this release preparation.

Do not blindly re-apply these migrations to the already provisioned project without reconciling migration history.

## Production cutover

The owner explicitly authorized switching GitHub Pages to this backend on 2026-10-28. Merging this branch changes the production frontend's Supabase URL and publishable key. This does not migrate old database contents; the new project's workspace and paper feed start empty. Legacy PaperFlow browser-local bookmarks/notes and previously uploaded files are not imported by the JSON workspace backup.

After deployment, the remaining manual verification is to sign in with the owner's GitHub account, save/reload workspace state, and upload/download/delete a private file. Until that is done, those flows remain unverified. If OAuth fails, restore the previous `docs/auth-config.js` values from the prior commit and redeploy while investigating the provider configuration.

No OAuth Client Secret, service-role key, or private user data is stored in this repository.
