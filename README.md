# myownllm.net

Marketing site for [MyOwnLLM](https://github.com/mrjeeves/MyOwnLLM) — an AI that runs on every device you own.

Static HTML/CSS/JS. No build step. Deployed to GitHub Pages via `.github/workflows/pages.yml`.

## Local preview

Any static server works:

```bash
python3 -m http.server 8080
# or
npx serve .
```

Then open <http://localhost:8080>.

## Files

- `index.html` — single-page landing
- `faq.html` — FAQ page
- `download.html` — full downloads page
- `styles.css` — all styling
- `main.js` — install-tab switcher, copy buttons, GitHub release wiring
- `favicon.svg` — favicon
- `CNAME` — custom domain for Pages
- `robots.txt`, `sitemap.xml` — SEO basics

## Deploy

Pushing to `main` triggers the Pages workflow. Custom domain (`myownllm.net`) is configured via `CNAME`.

## License

MIT — see [LICENSE](LICENSE).
