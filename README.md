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

**Site configuration → Environment variables**. Le **scope** est aussi important
que la valeur : voir l'encadré 🔐 en tête de [`netlify.toml`](./netlify.toml).

| Variable | Scope | Remarque |
| --- | --- | --- |
| `DATABASE_URL` | **Functions** | URL Neon **poolée** |
| `DATABASE_READY` = `true` | **Functions** | Active PostgreSQL. Laisser hors du scope *Builds* : au build la valeur est `undefined`, donc `getAllMedias()` renvoie `FALLBACK_CATALOG` et n'interroge pas la base |
| `NEXTAUTH_SECRET` | **Functions** | Secret JWT fort et unique (`openssl rand -base64 32`) |
| `BUNNY_STREAM_LIBRARY_ID` | **Functions** | Video Library Bunny.net |
| `BUNNY_STREAM_API_KEY` | **Functions** | Clé API de la Video Library |
| `BUNNY_STREAM_TOKEN_AUTHENTICATION_KEY` | **Functions** | Token Authentication |
| `BUNNY_STREAM_CDN_HOSTNAME` | **Functions** | Pull Zone, ex. `vz-xxxx.b-cdn.net` — utilisé seulement à la requête |
| `TMDB_API_TOKEN` (ou `TMDB_API_KEY`) | **Functions** | Import de métadonnées |
| `NEXT_PUBLIC_APP_URL` | **Builds** | URL publique (lu au prerender : `layout.tsx`, `sitemap.ts`) |
| `NEXT_PUBLIC_APP_NAME` | **Builds** | Nom affiché |

#### ⚠️ Pourquoi « Functions » et pas « Builds » pour les secrets

Turbopack **inline** les `process.env.*` dans les chunks serveur au moment du
build. Une clé déclarée en scope *Builds* se retrouve écrite en dur dans
`.netlify/.next/**` (chunks, `.map`, cache `.sst`) et fait échouer le scanner de
secrets Netlify :

```
found value at line 868 in .netlify/.next/build/chunks/[turbopack]_runtime.js
found value at line 1 in .netlify/.next/next-minimal-server.js.nft.json
```

Tous vos secrets ne sont lus qu'à l'exécution (dans les route handlers), donc le
scope *Functions* seul suffit — et supprime la fuite à la racine.

> Ne commitez **jamais** le fichier `.env` : il est ignoré par Git (`.env*` dans
> `.gitignore`). Seul `.env.example` est versionné.

#### Filet de sécurité (optionnel)

Si le hostname CDN reste signalé à tort (c'est un identifiant public, pas un
secret), excluez les artefacts de build du scan dans l'UI Netlify :

```
SECRETS_SCAN_OMIT_PATHS          = .next/cache/**,**/*.map,**/*.sst,**/*.nft.json
SECRETS_SCAN_SMART_DETECTION_OMIT_VALUES = vz-xxxxxxxx.b-cdn.net
```

N'utilisez `SECRETS_SCAN_ENABLED=false` qu'en dernier recours : vous perdez toute
détection de fuite, y compris sur de vraies clés.


### 4. Appliquer le schéma Prisma sur la base de production

Le déploiement Netlify ne migre **pas** la base. Il n'existe aucun dossier
`prisma/migrations` dans ce dépôt : il faut donc soit en créer un, soit pousser
le schéma directement.

**Option A — pousser le schéma (le plus simple ici)**, en local avec la
`DATABASE_URL` de production :

```bash
npx prisma db push     # crée les tables décrites dans schema.prisma
npm run seed           # optionnel, données de démonstration
```

**Option B — versionner une migration**, une fois pour toutes :

```bash
npx prisma migrate dev --name init   # génère prisma/migrations/<ts>_init/
git add prisma/migrations && git commit -m "chore: migration initiale"
```

Puis à chaque déploiement suivant :

```bash
npx prisma migrate deploy
```

> `prisma migrate deploy` échoue sans dossier `prisma/migrations` : c'est
> précisément l'option B qui le crée.


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

