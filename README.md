# BEA — British Education Alliance Website

This is the BEA website copy prepared for GitHub and Vercel. The site branding is BEA and the production domain is:

`https://britisheducationalliance.com`

## Main structure

```text
bea/
├── index.html
├── api/
├── css/
├── data/
├── js/
├── lib/
├── pages/
├── resources/
├── shared/
├── sql/
├── package.json
└── vercel.json
```

The shared header uses `/resources/logo3.png`. Put your BEA logo at:

`C:\Users\T14s Gen 2\Desktop\bea\resources\logo3.png`

All other resource images are preserved unchanged from the supplied project.

## Supabase

BEA must use its own Supabase project. The source website Supabase URL/key are not retained in this copy.

Before testing authentication, edit `/js/supabase-config.js` and replace:

- `https://YOUR_BEA_PROJECT_REF.supabase.co`
- `YOUR_BEA_SUPABASE_PUBLISHABLE_KEY`

Also set the BEA Vercel server variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

See `BEA_SETUP_FIRST.md` and `SUPABASE_SETUP.md`.

## Install / run locally

```bash
npm install
npm run dev
```

## Deploy

Connect the BEA GitHub repository to the BEA Vercel project, configure the BEA environment variables, then push normally:

```bash
git add .
git commit -m "update BEA website"
git push
```
