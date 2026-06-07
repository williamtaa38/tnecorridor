# TNE Corridor Vercel Website

This project is a static website converted from Wix HTML pages into a cleaner Vercel-ready structure.

The site is deployed through GitHub and Vercel.

## Pages

* `index.html` — Homepage
* `programmes.html` — Programmes / EduSeek UK Search page
* `why-iskandar.html` — Why Iskandar page

## Styling files

* `style.css` — Homepage styling
* `programmes.css` — Programmes page styling
* `why-iskandar.css` — Why Iskandar page styling

## JavaScript files

* `script.js` — Homepage script
* `programmes.js` — Programmes page script
* `why-iskandar.js` — Why Iskandar page script

## Recommended project structure

```text
tnecorridor/
├── index.html
├── style.css
├── script.js
├── programmes.html
├── programmes.css
├── programmes.js
├── why-iskandar.html
├── why-iskandar.css
├── why-iskandar.js
└── README.md
```

## Important link setup

For a simple static HTML website, use `.html` links between pages.

Example:

```html
<a href="index.html">Home</a>
<a href="programmes.html">Programmes</a>
<a href="why-iskandar.html">Why Iskandar</a>
```

Avoid using links like `/programmes` or `/why-iskandar` unless routing is configured separately.

## Deploy / Update

After editing or adding files, run these commands in VS Code terminal:

```bash
git status
git add .
git commit -m "update website"
git push
```

Vercel will automatically redeploy after GitHub receives the push.

## Live website

Main domain:

```text
https://tnecorridor.com
```

Programme page:

```text
https://tnecorridor.com/programmes.html
```

Why Iskandar page:

```text
https://tnecorridor.com/why-iskandar.html
```
