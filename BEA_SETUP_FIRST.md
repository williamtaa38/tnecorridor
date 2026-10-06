# BEA setup before deployment

This folder is the BEA-branded website copy.

## 1. Logo

The shared header now loads:

`/resources/logo3.png`

Place your BEA logo at:

`C:\Users\T14s Gen 2\Desktop\bea\resources\logo3.png`

No other image reference or image file was intentionally changed.

## 2. Separate BEA Supabase project

The source-project Supabase URL and browser keys were removed from this copy.

Edit `/js/supabase-config.js` and replace:

- `https://YOUR_BEA_PROJECT_REF.supabase.co`
- `YOUR_BEA_SUPABASE_PUBLISHABLE_KEY`

with the values from the separate BEA Supabase project.

For Vercel server-side admin functions, add BEA project values in the BEA Vercel project:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Use only the separate BEA Supabase values.

## 3. Supabase Auth URL configuration

For the BEA Supabase project, use:

- Site URL: `https://britisheducationalliance.com`
- Redirect URL: `https://britisheducationalliance.com/pages/reset-password.html`
- Optional www redirect: `https://www.britisheducationalliance.com/pages/reset-password.html`

## 4. Install and run

Because `node_modules` and `.git` are intentionally excluded from this clean copy:

```bash
npm install
npm run dev
```

For Vercel, connect this BEA folder/repository to the BEA Vercel project and set the BEA environment variables there.
