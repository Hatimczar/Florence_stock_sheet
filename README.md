# Florence Stock Sheet

Admin panel + customer portal for Florence Trading — merges manually uploaded Apple stock/price
sheets and the IT4Profit vendor catalog into a single per-customer view, with per-brand pricing
markups (percentage or fixed).

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Requires a `.dev.vars` file (gitignored) with
`ADMIN_PASSWORD`, `IT4PROFIT_USERNAME`, and `IT4PROFIT_PASSWORD`.

## Deployment

This project deploys to Cloudflare Workers via [OpenNext](https://opennext.js.org/cloudflare), not
Vercel. `npm run cf:deploy` builds and deploys manually; pushes to `main` also trigger an automatic
build+deploy through Cloudflare's Workers Builds Git integration.
