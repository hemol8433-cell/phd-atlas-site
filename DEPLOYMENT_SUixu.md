# Suixu — new backend development branch

This branch targets the newly provisioned Supabase project while keeping `main` and the currently published GitHub Pages site unchanged.

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

The GitHub OAuth App must use this Supabase callback:
`https://uoffmkyqigzrerqhxixm.supabase.co/auth/v1/callback`

In Supabase Auth URL Configuration:
- Site URL: `https://hemol8433-cell.github.io/phd-atlas-site/`
- Redirect URL allow-list must include `https://hemol8433-cell.github.io/phd-atlas-site/index.html`

The OAuth Client Secret is configured only in Supabase Auth Provider settings. Never commit it or expose a service-role/secret key to the browser.

## Database migrations

The two migrations in `supabase/migrations/` mirror the migrations already applied to the live project. They are for source control and reproducibility; do not blindly re-apply them to the already provisioned project without reconciling migration history.

## Publishing policy

This branch intentionally does not change `main` or the production Pages deployment. Before merging/cutover, confirm:
1. GitHub Provider credentials are saved and OAuth works.
2. Owner's GitHub identity appears in `auth.identities` with provider ID `280190617`.
3. The owner can save/reload workspace data and upload/download/delete private files.
4. An unrelated GitHub account cannot read the paper gate, workspace or private Storage objects.
5. Existing production behavior and backup/export paths have been reviewed.

After those checks, merge this branch through a reviewed PR to deploy the new public config. Do not use a service-role key in the static client.
