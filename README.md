# Jordan River Center for Certified Translation (JRC) — website

Static site, two languages, each with its own addresses:

- English: `/en/`, `/en/about/`, `/en/services/` …
- Arabic: `/ar/`, `/ar/about/`, `/ar/services/` …

## Editing

Edit the sources, then build. Never edit `en/` or `ar/` by hand: the build writes them again.

| What | Where |
|---|---|
| Pages (both languages in one file) | `src/pages/*.html` |
| Top bar, menu, footer, icons, services side list | `src/partials/*.html` |
| Styles (shared by both languages) | `css/style.css` |
| Scripts | `js/main.js` |
| Pictures | `assets/` |

In a page, text for one language sits in an element with the class `en` or `ar`
(`<span class="en">Home</span><span class="ar">الرئيسية</span>`). Links are written the simple way
(`about.html`, `assets/logo.jpg`); the build turns them into the right address for each language.

A page's title and description for search engines are the `data-title-*` and `data-desc-*` attributes on its
`<html>` tag. A new page is a new file in `src/pages/`; a file named `blog-<name>.html` becomes `/blog/<name>/`.

```bash
node build.mjs
```

The build needs only Node.js (no packages). It writes `en/`, `ar/`, `sitemap.xml`, and the small forwarding pages
at the old addresses (`index.html`, `about.html` …).

## Preview

Any static server from this folder, for example:

```bash
python -m http.server 5500
```

then open `http://localhost:5500/en/` or `http://localhost:5500/ar/`.

## Hosting

`vercel.json` sends the site root to `/en/` (or `/ar/` for Arabic browsers) and the old `*.html` addresses to the new
ones. On a host other than Vercel the forwarding pages do the same job in the browser.

## Colours

Brand blue `#6367f6` and brand red `#d71728`, set once at the top of `css/style.css` (`--blue`, `--red`).
