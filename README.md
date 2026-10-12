This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Déploiement sur Netlify

La configuration vit dans [`netlify.toml`](./netlify.toml) : commande de build
`prisma generate && next build`, Node 22, `publish = ".next"`. Netlify détecte
automatiquement Next.js et utilise son adaptateur OpenNext (Server Components,
ISR, Route Handlers et Server Actions sont pris en charge).

### 1. Pousser le code sur GitHub

```bash
git add .
git commit -m "chore: configuration Netlify + fonctionnalités Bunny/TMDB"
git push origin main
```

### 2. Connecter le dépôt à Netlify

1. [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. Autoriser GitHub et sélectionner le dépôt `Weeb_Stream`
3. Les valeurs de `netlify.toml` sont détectées automatiquement :
   - **Build command** : `prisma generate && next build`
   - **Publish directory** : `.next`
4. Cliquer sur **Deploy**

### 3. Renseigner les variables d'environnement

**Site configuration → Environment variables** (le build échouera ou le site
affichera le catalogue de secours sans elles) :

| Variable | Portée | Remarque |
| --- | --- | --- |
| `DATABASE_URL` | Build + Functions | URL Neon **poolée** |
| `DATABASE_READY` | Functions | Mettre `true` pour activer PostgreSQL (sinon `FALLBACK_CATALOG`) |
| `NEXTAUTH_SECRET` | Functions | Secret JWT fort et unique (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Functions | URL publique du site, ex. `https://mon-site.netlify.app` |
| `BUNNY_STREAM_LIBRARY_ID` | Functions | Video Library Bunny.net |
| `BUNNY_STREAM_API_KEY` | Functions | Clé API de la Video Library |
| `BUNNY_STREAM_CDN_HOSTNAME` | Build | Pull Zone, ex. `vz-xxxx.b-cdn.net` |
| `BUNNY_STREAM_TOKEN_AUTHENTICATION_KEY` | Functions | Token Authentication |
| `TMDB_API_TOKEN` (ou `TMDB_API_KEY`) | Functions | Import de métadonnées |
| `NEXT_PUBLIC_APP_URL` | Build | URL publique du site |
| `NEXT_PUBLIC_APP_NAME` | Build | Nom affiché |

> Ne commitez **jamais** le fichier `.env` : il est ignoré par Git (`.env*` dans
> `.gitignore`). Seul `.env.example` est versionné.

### 4. Appliquer le schéma Prisma sur la base de production

Le déploiement Netlify ne migre **pas** la base. À faire une fois, en local avec
la `DATABASE_URL` de production :

```bash
npx prisma migrate deploy   # ou : npx prisma db push
npm run db:seed             # optionnel, données de démonstration
```

### Points d'attention

- **Fuseau horaire** : Netlify build en UTC, ce qui peut décaler les dates
  affichées. Ajoutez `TZ = "Europe/Paris"` dans `[build.environment]` si besoin.
- **Fonctions** : timeout de 10 s (26 s à partir du plan Pro) et limite de
  payload de 6 Mo. Les uploads vidéo passent par Bunny TUS en direct depuis le
  client, ce qui évite ces limites.
- **Webhook de paiement** : mettre à jour l'URL de callback chez le prestataire
  vers `https://<votre-domaine>/api/payment/webhook`.
- **Domaine personnalisé** : pensez à mettre `NEXTAUTH_URL` et
  `NEXT_PUBLIC_APP_URL` à jour, puis redéployer.
- **Anti-fuite de déploiement** (*skew protection*) : ajoutez la variable
  `NETLIFY_NEXT_SKEW_PROTECTION = true`.

### Déploiement en ligne de commande (optionnel)

```bash
npm install -g netlify-cli
netlify login
netlify init          # lie le dossier au site Netlify
netlify env:set DATABASE_URL "postgresql://..."
netlify deploy --prod # compile et publie
```

