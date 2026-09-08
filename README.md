# Sloan Financial Solutions — Landing Page

Static landing page for Sloan Financial Solutions (Burnsville, MN). No build step: plain HTML, CSS, and JavaScript served as static assets on Vercel.

## Files

- `index.html` — page structure and copy
- `styles.css` — navy / beige / gold design system, layout, responsive rules
- `script.js` — footer year
- `favicon.svg`, `og-image.svg` — brand icon and social share image
- `vercel.json` — clean URLs, security headers, asset caching

## Local preview

```bash
npx serve .
```

## Deploy to Vercel

The project is linked to a GitHub repository. Every push to `main` triggers a production deployment.

Manual deploy from the CLI:

```bash
npm i -g vercel
vercel --prod
```
