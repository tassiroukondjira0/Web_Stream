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

## Déploiement sur Vercel

Next.js est développé par Vercel : le support est natif et complet (Server
Components, ISR, Partial Prerender, Server Actions, Middleware). Aucun
adaptateur tiers, aucun fichier de configuration obligatoire.

Deux fichiers existent pour fiabiliser le déploiement :

| Fichier | Rôle |
| --- | --- |
| `vercel.json` | Épingle `prisma generate && next build` comme commande de build |
| `scripts/vercel-env.ps1` | Envoie les variables de `.env` vers Vercel (liste blanche) |

### 1. Pousser le code sur GitHub

```bash
git add .
git commit -m "feat: configuration Vercel, helper d'URL, durcissement des secrets"
git push origin main
```

### 2. Importer le projet

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository**
2. Sélectionner le dépôt `Weeb_Stream`
3. Vercel détecte Next.js automatiquement. Vérifier dans *Build & Output* :
   - **Build Command** : `prisma generate && next build`
   - **Install Command** : `npm ci`
4. Cliquer sur **Deploy**

> Le premier déploiement peut échouer sur les routes API faute de variables
> d'environnement. C'est attendu : poursuivez avec l'étape 3.

### 3. Configurer les variables d'environnement

**Site → Settings → Environment Variables**. Cocher les 3 environnements
(*Production*, *Preview*, *Development*).

| Variable | Valeur | Remarque |
| --- | --- | --- |
| `DATABASE_URL` | URL Neon **poolée** | Obligatoire. Prisma en a besoin au build |
| `DATABASE_READY` | `true` | Active PostgreSQL. Sinon `FALLBACK_CATALOG` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | Signature des sessions. **Aucun repli** |
| `NEXT_PUBLIC_APP_NAME` | `CinéMax` | Nom affiché |
| `NEXT_PUBLIC_APP_URL` | *(optionnel)* | Voir encadré ci-dessous |
| `BUNNY_STREAM_LIBRARY_ID` | ID Video Library | Vidéos |
| `BUNNY_STREAM_API_KEY` | Clé API Library | Vidéos |
| `BUNNY_STREAM_CDN_HOSTNAME` | Pull Zone hostname | URLs signées |
| `BUNNY_STREAM_TOKEN_AUTHENTICATION_KEY` | Token Authentication | URLs signées |
| `TMDB_API_TOKEN` | Token v4 | Import de métadonnées |

#### Automatiser l'envoi (recommandé)

Plutôt qu'un copier-coller manuel, le script applique une **liste blanche** —
seules les variables réellement lues par le code sont transmises :

```powershell
npm run vercel:env          # demande confirmation, puis envoie
```

Options utiles :

```powershell
npm run vercel:env -- -Force                    # écrase sans confirmer
npm run vercel:env -- -Environments production  # une seule cible
```

La valeur est passée sur `stdin` à `vercel env add` : elle n'apparaît ni à
l'écran ni dans l'historique du shell.

Sont **volontairement exclus** : `NEON_API_KEY`, `NEON_BRANCH`,
`DATABASE_URL_UNPOOLED` et `NEXTAUTH_URL` — le projet n'utilise plus l'API
Neon (voir la section « Aucune API propriétaire de fournisseur » du README).

#### `NEXT_PUBLIC_APP_URL` peut rester vide

`src/lib/env.ts` résout l'URL publique dans cet ordre :

1. `NEXT_PUBLIC_APP_URL` — contrôle explicite (domaine personnalisé)
2. `VERCEL_PROJECT_PRODUCTION_URL` — injecté par Vercel, **domaine stable**
3. `http://localhost:3000` — développement

Vous n'avez donc rien à renseigner au premier déploiement. Renseignez-la
uniquement si vous attachez un domaine personnalisé.

> `VERCEL_URL` n'est volontairement **pas** utilisé : c'est l'URL du déploiement
> courant, suffixée d'un hash unique. S'en servirait produirait des URL
> canoniques différentes pour un même contenu (*duplicate content*).

### 4. Vérifier la base de données

Le déploiement ne crée **pas** les tables. Vérification rapide en local :

```bash
npm run db:studio    # ou : npm run db:push si les tables manquent
```

Ce projet utilise `prisma db push` (pas de dossier `prisma/migrations`).
Pour passer à des migrations versionnées :

```bash
npx prisma migrate dev --name init
git add prisma/migrations && git commit -m "chore: migration initiale"
npm run db:migrate   # ensuite, à chaque déploiement
```

### 5. Redéployer

```bash
npm run deploy       # vercel --prod
```

Ou pousser sur `main` : chaque commit déclenche un déploiement automatique.

## Variables d'environnement : ce qui est lu par le code

| Variable | Lue dans | Portée |
| --- | --- | --- |
| `DATABASE_URL` | `prisma/schema.prisma` | Build + Runtime |
| `DATABASE_READY` | `src/lib/catalog.ts`, `api/auth/*`, `api/admin/*` | Runtime |
| `NEXTAUTH_SECRET` | `src/lib/auth.ts` | Runtime |
| `NEXT_PUBLIC_APP_URL` | `src/lib/env.ts` | Build (inliné) |
| `NEXT_PUBLIC_APP_NAME` | — *(non lue actuellement)* | Build |
| `BUNNY_STREAM_*` | `src/lib/bunny-stream.ts` | Runtime |
| `TMDB_API_TOKEN` / `TMDB_API_KEY` | `src/lib/tmdb.ts` | Runtime |

**Non utilisées** (ne les renseignez pas) : `NEXTAUTH_URL`, `CLOUDFLARE_*`.

### Aucune API propriétaire de fournisseur

Le CLI Neon (`@neon/config`, `@neon/env`) et son fichier `neon.ts` ont été
retirés. `prisma/schema.prisma` se contente du provider `postgresql` standard :

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Votre base reste donc chez Neon, Supabase, Railway ou en local **sans changer
une ligne de code** — seule `DATABASE_URL` compte. Préférez l'URL **poolée** en
production : le serverless ouvre de nombreuses connexions courtes.

> Le fichier `.env` est ignoré par Git (`.env*` dans `.gitignore`). Seul
> `.env.example` est versionné.

## Points d'attention

- **Plan Hobby = usage non commercial.** Vercel impose le plan Pro (20 $/mois)
  dès qu'il y a monétisation. Avec un système d'abonnement (`/premium`,
  webhook de paiement), vérifiez votre éligibilité.
- **Limites Hobby** : 100 Go de bande passante, 1 M d'invocations de fonctions,
  4 h de CPU actif et 5 000 transformations d'images par mois. Vos vidéos
  passant par Bunny.net, votre consommation reste faible.
- **Timeout des fonctions** : 10 s par défaut. L'import TMDB
  (`/api/admin/import/tmdb`) peut le dépasser sur un gros lot.
- **Webhook de paiement** : mettez à jour l'URL de callback chez le
  prestataire vers `https://<votre-domaine>/api/payment/webhook`.
- **Redéployez** après tout changement de `NEXT_PUBLIC_APP_URL` : les variables
  `NEXT_PUBLIC_*` sont inlinées au moment du build.

## Récupérer les variables depuis Vercel

```bash
npm run vercel:pull   # écrit .env.local depuis l'environnement production
```

`.env.local` est également ignoré par Git.

