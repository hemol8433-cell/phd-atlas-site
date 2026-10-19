# PhD Atlas · Public Login Site

This repository contains **only the public web client** and the login interface for a single-owner PhD research workspace. It **does not** include journals, experiments, private recommendations, or service-role credentials.

Production site (after enabling Pages): https://hemol8433-cell.github.io/phd-atlas-site/

To publish: GitHub repository **Settings → Pages → Build and deployment → Source: Deploy from a branch**, choose `main` and `/docs`, then Save.

To finish OAuth, in the Supabase project Authentication → URL Configuration set **Site URL** to `https://hemol8433-cell.github.io/phd-atlas-site/` and add `https://hemol8433-cell.github.io/phd-atlas-site/index.html` to Redirect URLs.

The GitHub OAuth application Authorization callback URL remains `https://zsqbubjrjyycwduceoas.supabase.co/auth/v1/callback`. OAuth secrets must only be stored in the authentication provider dashboard. User data is protected by RLS in the private Supabase project; the source for this public client is not itself private.
