// Builds the two language versions of the site from the bilingual sources. No dependencies.
//   node build.mjs
// Sources: src/pages/*.html   every page holds both languages (elements with class "en" or "ar")
//          src/partials/*.html  icon sprite, header (top bar + menu), footer and the services side list;
//                               a page takes one in with a marker such as <!-- @header -->
// Output:  en/<page>/index.html and ar/<page>/index.html  (each language has its own address)
//          index.html and the old <page>.html addresses: small pages that forward to the new addresses
//          sitemap.xml
// Shared files are not copied: /assets, /css and /js are used by both languages as they are.
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const SITE = 'https://jrc-translation.com';
const LANGS = ['en', 'ar'];
const OTHER = { en: 'ar', ar: 'en' };
const NAME = { en: 'Jordan River Center for Certified Translation (JRC)', ar: 'مركز نهر الأردن للترجمة المعتمدة' };
const TODAY = new Date().toISOString().slice(0, 10);

const read = (p) => readFileSync(join(root, p), 'utf8');
const write = (p, s) => { mkdirSync(dirname(join(root, p)), { recursive: true }); writeFileSync(join(root, p), s); };
const hash = (p) => createHash('md5').update(readFileSync(join(root, p))).digest('hex').slice(0, 8);

const names = readdirSync(join(root, 'src/pages')).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5)).sort();
// blog-<post>.html becomes /blog/<post>/, index.html becomes the language's home
const slugOf = (name) => (name === 'index' ? '' : name.startsWith('blog-') ? 'blog/' + name.slice(5) : name);
const pathOf = (lang, name) => `/${lang}/${slugOf(name) ? slugOf(name) + '/' : ''}`;
const PARTIALS = ['sprite', 'header', 'footer', 'aside-services'];
const partial = Object.fromEntries(PARTIALS.map((k) => [k, read(`src/partials/${k}.html`).trimEnd()]));
const ASSET_V = { css: hash('css/style.css'), js: hash('js/main.js') };

/* ---------- small HTML helpers ---------- */
const TAG = /<!--[\s\S]*?-->|<(script|style)\b(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/\1>|<\/?([a-zA-Z][\w-]*)(?:[^>"']|"[^"]*"|'[^']*')*>/g;
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const hasClass = (tag, cls) => { const m = /\sclass\s*=\s*"([^"]*)"/.exec(tag); return !!m && m[1].split(/\s+/).includes(cls); };

// Removes every element that carries the class of the other language, with everything inside it.
function stripLang(html, drop) {
  let out = '', last = 0, depth = 0;
  for (const m of html.matchAll(TAG)) {
    const tok = m[0];
    if (!depth) out += html.slice(last, m.index);
    last = m.index + tok.length;
    if (tok.startsWith('<!--')) { if (!depth) out += tok; continue; }
    if (m[1]) { if (!depth && !hasClass(tok.slice(0, tok.indexOf('>') + 1), drop)) out += tok; continue; }
    const closing = tok[1] === '/', selfClosing = tok.endsWith('/>') || VOID.has(m[2].toLowerCase());
    if (depth) { if (closing) depth--; else if (!selfClosing) depth++; continue; }
    if (!closing && hasClass(tok, drop)) { if (!selfClosing) depth = 1; continue; }
    out += tok;
  }
  if (depth) throw new Error('unbalanced element with class ' + drop);
  return out + html.slice(last);
}
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const textOf = (html) => decode(html.replace(/<(script|style)\b[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const ld = (data) => `<script type="application/ld+json">${JSON.stringify(data)}</script>`;

/* ---------- addresses ---------- */
// Page links, pictures and files are written in the sources the simple way ("about.html", "assets/x.webp");
// here they become addresses that work from any folder.
function rewriteUrls(html, lang) {
  const page = (href) => {
    const m = /^([a-z0-9-]+)\.html(#[\w-]*)?$/.exec(href);
    if (!m) return null;
    if (!names.includes(m[1])) throw new Error('link to a page that does not exist: ' + href);
    return pathOf(lang, m[1]) + (m[2] ?? '');
  };
  const asset = (u) => u.replace(/^(?:\.\.\/)?assets\//, '/assets/');
  return html
    .replace(/\b(href|src)="([^"]*)"/g, (all, k, v) => `${k}="${page(v) ?? asset(v)}"`)
    .replace(/\bsrcset="([^"]*)"/g, (all, v) => `srcset="${v.split(',').map((x) => asset(x.trim())).join(', ')}"`)
    .replace(/url\((['"]?)(?:\.\.\/)?assets\//g, 'url($1/assets/');
}

/* ---------- structured data ---------- */
// The centre's details for search engines: the same facts the site carried before, on every page of both languages
function organisation(lang) {
  return {
    '@context': 'https://schema.org', '@type': 'ProfessionalService',
    name: NAME.en, alternateName: NAME.ar, url: SITE + pathOf(lang, 'index'), logo: SITE + '/assets/logo.jpg',
    telephone: '+962776053228', email: 'info@jrc-translation.com', foundingDate: '2017',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Queen Rania Al Abdullah Street, Opposite North Amman Court, Building 349, Akawi & Badad Commercial Complex, Office 102, 1st Floor',
      addressLocality: 'Al Jubaiha, Amman', postalCode: '11941', addressCountry: 'JO',
    },
    hasMap: 'https://maps.app.goo.gl/UBt6GQNepTBSjN7G9',
    sameAs: ['https://www.facebook.com/jrctranslation/', 'https://www.instagram.com/jrctranslation/', 'https://www.linkedin.com/company/jordan-river-center-for-certified-translation/home/'],
  };
}
function pageData(body, lang, url, desc) {
  const out = [];
  // Service and BlogPosting blocks written in the page: the names swap for Arabic and the shared facts are added here
  body = body.replace(/<script type="application\/ld\+json" data-ld>([\s\S]*?)<\/script>\n?/g, (all, json) => {
    const d = JSON.parse(json), swap = (a, b) => { if (lang === 'ar' && d[b]) [d[a], d[b]] = [d[b], d[a]]; };
    const org = { '@type': 'ProfessionalService', name: NAME[lang], url: SITE + pathOf(lang, 'index'), telephone: '+962776053228' };
    if (d['@type'] === 'Service') {
      swap('name', 'alternateName');
      Object.assign(d, { description: desc, url, areaServed: { '@type': 'Country', name: lang === 'ar' ? 'الأردن' : 'Jordan' }, availableLanguage: ['ar', 'en'], provider: org });
    } else {
      swap('headline', 'alternativeHeadline');
      const publisher = { '@type': 'Organization', name: NAME[lang], logo: { '@type': 'ImageObject', url: SITE + '/assets/logo.jpg' } };
      Object.assign(d, { description: desc, inLanguage: lang, mainEntityOfPage: url, author: { '@type': 'Organization', name: NAME[lang] }, publisher });
    }
    out.push(d);
    return '';
  });
  // Breadcrumbs and questions are read from what the page shows, so they always match it
  const crumbs = /<nav class="crumbs"[^>]*>([\s\S]*?)<\/nav>/.exec(body);
  if (crumbs) {
    const items = crumbs[1].split(/<span>\/<\/span>/).map((part, i) => {
      const href = /<a href="([^"]*)"/.exec(part);
      return { '@type': 'ListItem', position: i + 1, name: textOf(part), item: href ? SITE + href[1] : url };
    });
    out.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items });
  }
  const faqs = [...body.matchAll(/<details class="faq-item[^"]*"[^>]*>\s*<summary>([\s\S]*?)<\/summary>\s*<div class="faq-answer">([\s\S]*?)<\/div>\s*<\/details>/g)];
  if (faqs.length) out.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((m) => ({ '@type': 'Question', name: textOf(m[1]), acceptedAnswer: { '@type': 'Answer', text: textOf(m[2]) } })) });
  return [body, out];
}

/* ---------- one page in one language ---------- */
function render(name, lang) {
  const src = read(`src/pages/${name}.html`);
  const meta = Object.fromEntries([...(/<html\b[^>]*>/.exec(src)[0]).matchAll(/data-([a-z-]+)="([^"]*)"/g)].map((m) => [m[1], decode(m[2])]));
  for (const k of ['page', 'title-en', 'title-ar', 'desc-en', 'desc-ar', 'og-image']) if (!meta[k]) throw new Error(`${name}: data-${k} is missing`);
  const url = SITE + pathOf(lang, name), alt = SITE + pathOf(OTHER[lang], name);
  const title = meta['title-' + lang], desc = meta['desc-' + lang];

  let body = /<body>([\s\S]*)<\/body>/.exec(src)[1];
  const extraHead = /<!-- @head -->([\s\S]*?)<\/head>/.exec(src)[1];
  for (const k of PARTIALS) body = body.replace(`<!-- @${k} -->`, partial[k]);
  body = stripLang(extraHead + '<!--body-->' + body, OTHER[lang]);
  // a picture's description: alt is the English one, data-alt-ar the Arabic one
  body = body.replace(/\salt="([^"]*)" data-alt-ar="([^"]*)"/g, (all, en, ar) => ` alt="${lang === 'ar' ? ar : en}"`);
  // form hints and list choices carry both languages as attributes
  body = body.replace(/\sdata-ph-en="([^"]*)"\s+data-ph-ar="([^"]*)"/g, (all, en, ar) => ` placeholder="${lang === 'ar' ? ar : en}"`)
    .replace(/<option data-en="([^"]*)" data-ar="([^"]*)">[^<]*<\/option>/g, (all, en, ar) => `<option>${lang === 'ar' ? ar : en}</option>`);
  body = rewriteUrls(body, lang).replace(/href="@alt"/g, `href="${pathOf(OTHER[lang], name)}"`);
  let data;
  [body, data] = pageData(body, lang, url, desc);
  body = body.slice(body.indexOf('<!--body-->') + 11).trim();

  const article = name.startsWith('blog-');
  const head = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${attr(title)}</title>`,
    `<meta name="description" content="${attr(desc)}">`,
    meta.keywords ? `<meta name="keywords" content="${attr(meta.keywords)}">` : '',
    `<meta property="og:type" content="${article ? 'article' : 'website'}">`,
    `<meta property="og:site_name" content="${attr(NAME[lang])}">`,
    `<meta property="og:title" content="${attr(title)}">`,
    `<meta property="og:description" content="${attr(desc)}">`,
    `<meta property="og:image" content="${SITE}/${meta['og-image']}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:locale" content="${lang === 'ar' ? 'ar_JO' : 'en_US'}">`,
    `<meta property="og:locale:alternate" content="${lang === 'ar' ? 'en_US' : 'ar_JO'}">`,
    `<link rel="canonical" href="${url}">`,
    `<link rel="alternate" hreflang="en" href="${SITE + pathOf('en', name)}">`,
    `<link rel="alternate" hreflang="ar" href="${SITE + pathOf('ar', name)}">`,
    `<link rel="alternate" hreflang="x-default" href="${SITE + pathOf('en', name)}">`,
    '<link rel="icon" href="/assets/logo.jpg">',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">',
    `<link rel="stylesheet" href="/css/style.css?v=${ASSET_V.css}">`,
    ld(organisation(lang)),
    ...data.map(ld),
  ].filter(Boolean).map((l) => '  ' + l).join('\n');

  const html = `<!doctype html>\n<html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}" data-page="${meta.page}">\n<head>\n${head}\n</head>\n<body>\n\n${body}\n\n<script src="/js/main.js?v=${ASSET_V.js}"></script>\n</body>\n</html>\n`;
  if ([...html.matchAll(/\sclass="([^"]*)"/g)].some((m) => m[1].split(/\s+/).includes(OTHER[lang]))) throw new Error(`${name} (${lang}): text of the other language is left in the page`);
  const foreign = lang === 'ar' && [...html.matchAll(/<img\b[^>]*\salt="([^"]+)"/g)].find((m) => !/[\u0600-\u06FF]/.test(m[1]));
  if (foreign) throw new Error(`${name} (ar): a picture is described in English only: ${foreign[1]} (add data-alt-ar right after its alt)`);
  if (/(?:href|src)="(?!\/|#|https?:|mailto:|tel:)[^"]*"/.test(html)) throw new Error(`${name} (${lang}): a relative address is left: ` + /(?:href|src)="(?!\/|#|https?:|mailto:|tel:)[^"]*"/.exec(html)[0]);
  write(`${lang}${slugOf(name) ? '/' + slugOf(name) : ''}/index.html`, html);
  return { title, alt };
}

/* ---------- pages that only forward: the site root and the old <page>.html addresses ---------- */
// A visitor who chose Arabic before, follows an old "?lang=ar" link or uses an Arabic browser goes to /ar/, everyone else to /en/.
function forwarder(name) {
  const en = pathOf('en', name), ar = pathOf('ar', name);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${attr(NAME.en)}</title>
  <link rel="canonical" href="${SITE + en}">
  <link rel="alternate" hreflang="en" href="${SITE + en}">
  <link rel="alternate" hreflang="ar" href="${SITE + ar}">
  <link rel="alternate" hreflang="x-default" href="${SITE + en}">
  <link rel="icon" href="/assets/logo.jpg">
  <script>(function(){var l=null;try{l=new URLSearchParams(location.search).get("lang")||localStorage.getItem("jrc-lang")}catch(e){}if(l!=="ar"&&l!=="en")l=/^ar\\b/i.test(navigator.language||"")?"ar":"en";location.replace((l==="ar"?"${ar}":"${en}")+location.hash)})();</script>
  <noscript><meta http-equiv="refresh" content="0; url=${en}"></noscript>
</head>
<body>
  <p><a href="${en}">${NAME.en}</a></p>
  <p lang="ar" dir="rtl"><a href="${ar}">${NAME.ar}</a></p>
</body>
</html>
`;
}

/* ---------- build ---------- */
for (const lang of LANGS) rmSync(join(root, lang), { recursive: true, force: true });
const built = [];
for (const name of names) for (const lang of LANGS) built.push({ name, lang, ...render(name, lang) });
// the addresses the site had before each language got its own (kept so old links and bookmarks still arrive)
const OLD = ['index', 'about', 'services', 'certified-translation-amman', 'interpretation-services-jordan', 'visa-immigration-translation', 'military-interpretation-jordan', 'languages', 'faq', 'blog', 'blog-certified-translation-amman', 'blog-military-interpreting-jordan', 'blog-certified-translation-jordan', 'contact'];
for (const name of OLD) write(`${name}.html`, forwarder(name));

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${names.flatMap((name) => LANGS.map((lang) => `  <url><loc>${SITE + pathOf(lang, name)}</loc><lastmod>${TODAY}</lastmod>${LANGS.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${SITE + pathOf(l, name)}"/>`).join('')}<xhtml:link rel="alternate" hreflang="x-default" href="${SITE + pathOf('en', name)}"/></url>`)).join('\n')}
</urlset>
`;
write('sitemap.xml', sitemap);
console.log(`built ${built.length} pages (${names.length} x ${LANGS.length}), css ${ASSET_V.css}, js ${ASSET_V.js}`);
