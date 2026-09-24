# Juan María Herrera Martín - Research Website

Static, dependency-free academic website prepared for the personal GitHub Pages site at `https://herramar.github.io/`. The production output contains six primary pages, a 404 page, shared CSS and JavaScript, structured source data, scholarly metadata, and a Pages deployment workflow.

## Local preview

Requirement: Node.js 20 or newer.

```bash
npm ci
npm run build
npm run check
npm run serve
```

Open `http://localhost:8080/`. The generator uses root-relative URLs so local output matches the personal GitHub Pages site.

To use a different port:

```bash
PORT=9000 npm run serve
```

## GitHub Pages deployment

1. Create a repository named exactly `herramar.github.io` under the `herramar` account and place the contents of this project at its root.
2. Push to `main` or `master`.
3. In repository settings, set Pages to use GitHub Actions.
4. The workflow builds and deploys the site at `https://herramar.github.io/`.

No custom domain, analytics, cookies, backend, remote fonts, or third-party embeds are configured.

## Architecture

- `src/data/`: editorially reviewed JSON records for the person profile, themes, publications, projects, teaching, presentations, organizations, awards, and site settings.
- `src/assets/`: shared CSS, progressively enhanced JavaScript, favicon, and social-preview source.
- `scripts/build.mjs`: dependency-free static generator that creates `_site/`.
- `scripts/check.mjs`: structural, record-count, URL-shape, privacy-exclusion, and JavaScript safety checks.
- `_site/`: generated deployable output; excluded from version control and recreated by the build.

All core content and navigation are rendered in HTML. JavaScript is limited to mobile-menu behavior and publication filtering. With JavaScript disabled, the complete navigation and publication list remain available.

## Updating content

Edit the appropriate JSON file in `src/data/`, keep `status`, `source_refs`, and `last_verified` current, then run `npm test`. Publication contribution fields and unsupported project roles are intentionally absent. Do not add citation counts, private CV data, contract details, or publication-project relationships without fresh review.

## Adding approved media

The site currently uses an approved portrait. Do not copy private CV material, confidential technical images, or unlicensed figures into this project.

To add a portrait, place optimized AVIF/WebP/JPEG files in `src/assets/images/`, then replace `"portrait": null` in `src/data/person.json` with:

```json
{
  "src": "juan-herrera-portrait-2026-800.jpg",
  "webp": "juan-herrera-portrait-2026-800.webp",
  "avif": "juan-herrera-portrait-2026-800.avif",
  "width": 800,
  "height": 1000,
  "alt": "Portrait of Juan María Herrera Martín.",
  "credit": "Approved credit line"
}
```

Record the rights holder, permission, credit, crop, and alt-text decision outside the public asset directory before publishing. Replace `src/assets/images/social-preview.png` with an approved 1200 × 630 image when available, keeping the filename stable.

## Known limitation

The included social preview is a text-only identity graphic. Documentary research photography beyond the portrait is intentionally deferred until image selection and permissions are complete. Cross-browser and screen-reader checks that require physical Safari/iOS, Android, NVDA, or VoiceOver remain deployment-owner tasks.
