#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Envoie les variables d'environnement de .env vers Vercel.

.DESCRIPTION
    Évite le copier-coller manuel dans le dashboard Vercel, source d'erreurs.

    Utilise une LISTE BLANCHE : seules les variables réellement lues par
    l'application sont transmises. Toute autre variable présente dans .env
    (NEXTAUTH_URL, CLOUDFLARE_*, etc.) est ignorée — le code ne l'utilise pas.

.PARAMETER Environments
    Cibles Vercel. Par défaut : production, preview, development.

.PARAMETER Force
    Écrase une variable existante sans demander confirmation.

.EXAMPLE
    .\scripts\vercel-env.ps1
    .\scripts\vercel-env.ps1 -Environments production -Force
#>

[CmdletBinding()]
param(
    [string[]] $Environments = @("production", "preview", "development"),
    [switch] $Force
)

$ErrorActionPreference = "Stop"

# ─── Liste blanche : variable => valeur (null = lire depuis .env) ─────────────
$Whitelist = [ordered]@{
    "DATABASE_URL"                        = $null   # URL PostgreSQL poolée
    "DATABASE_READY"                      = "true"  # active PostgreSQL
    "NEXTAUTH_SECRET"                     = $null   # signature des sessions JWT
    "NEXT_PUBLIC_APP_NAME"                = $null
    "NEXT_PUBLIC_APP_URL"                 = $null   # vide => fallback Vercel
    "BUNNY_STREAM_LIBRARY_ID"             = $null
    "BUNNY_STREAM_API_KEY"                = $null
    "BUNNY_STREAM_CDN_HOSTNAME"           = $null
    "BUNNY_STREAM_TOKEN_AUTHENTICATION_KEY" = $null
    "TMDB_API_TOKEN"                      = $null
    "TMDB_API_KEY"                        = $null
}

# Variables présentes dans .env mais hors liste blanche (affichage informatif)
$Excluded = @("NEON_API_KEY", "NEON_BRANCH", "DATABASE_URL_UNPOOLED", "NEXTAUTH_URL", "CLOUDFLARE_STREAM_JWK_KEY", "CLOUDFLARE_STREAM_PEM_KEY_ID", "CLOUDFLARE_CUSTOMER_SUBDOMAIN")

$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile  = Join-Path $repoRoot ".env"

Write-Host ""
Write-Host "  Synchronisation des variables vers Vercel" -ForegroundColor Cyan
Write-Host "  =========================================" -ForegroundColor DarkGray
Write-Host ""

# ─── Vérifications préalables ────────────────────────────────────────────────
if (-not (Test-Path $envFile)) {
    Write-Host "  ERREUR : fichier .env introuvable dans $repoRoot" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "  ERREUR : CLI Vercel absente. Installez-la : npm i -g vercel" -ForegroundColor Red
    exit 1
}

# Lecture de .env (les valeurs ne sont jamais affichées)
$values = @{}
foreach ($line in Get-Content $envFile) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
        $values[$matches[1]] = $matches[2].Trim().Trim('"').Trim("'")
    }
}

Write-Host "  .env lu : $($values.Count) variable(s)" -ForegroundColor DarkGray
Write-Host ""

# ─── Construction du plan ────────────────────────────────────────────────────
$plan = @()
foreach ($name in $Whitelist.Keys) {
    $value = if ($null -ne $Whitelist[$name]) { $Whitelist[$name] } else { $values[$name] }

    if ([string]::IsNullOrWhiteSpace($value)) {
        $plan += [pscustomobject]@{
            Name    = $name
            Value   = $null
            Action  = "ignorer"
            Detail  = "vide dans .env"
        }
        continue
    }

    $preview = if ($value.Length -gt 10) { $value.Substring(0, 6) + "..." } else { "***" }
    $plan += [pscustomobject]@{
        Name   = $name
        Value  = $value
        Action = "envoyer"
        Detail = $preview
    }
}

# ─── Récapitulatif ───────────────────────────────────────────────────────────
Write-Host "  À envoyer :" -ForegroundColor Green
$plan | Where-Object Action -eq "envoyer" | ForEach-Object {
    Write-Host ("    + {0,-38} {1}" -f $_.Name, $_.Detail)
}

$skipped = $plan | Where-Object Action -eq "ignorer"
if ($skipped) {
    Write-Host ""
    Write-Host "  Ignorées (vides dans .env) :" -ForegroundColor Yellow
    $skipped | ForEach-Object { Write-Host ("    - {0}" -f $_.Name) }
}

Write-Host ""
Write-Host "  Exclues volontairement (non utilisées par le code) :" -ForegroundColor DarkGray
$Excluded | Where-Object { $values.ContainsKey($_) } | ForEach-Object {
    Write-Host ("    x {0}" -f $_)
}

$toSend = @($plan | Where-Object Action -eq "envoyer")
if ($toSend.Count -eq 0) {
    Write-Host ""
    Write-Host "  Rien à envoyer." -ForegroundColor Yellow
    exit 0
}

# ─── Confirmation ────────────────────────────────────────────────────────────
if (-not $Force) {
    Write-Host ""
    $answer = Read-Host "  Envoyer ces $($toSend.Count) variable(s) vers $($Environments -join ', ') ? [o/N]"
    if ($answer -notmatch '^[oOyY]') {
        Write-Host "  Annulé." -ForegroundColor Yellow
        exit 0
    }
}

# ─── Envoi ───────────────────────────────────────────────────────────────────
$ok = 0
$fail = 0

foreach ($item in $toSend) {
    foreach ($env in $Environments) {
        # `vercel env add` lit la valeur sur stdin : rien n'apparaît dans l'historique
        $item.Value | vercel env add $item.Name $env 2>&1 | Out-Null

        if ($LASTEXITCODE -eq 0) {
            $ok++
            Write-Host ("    OK   {0} -> {1}" -f $item.Name, $env) -ForegroundColor Green
        } else {
            $fail++
            Write-Host ("    FAIL {0} -> {1}" -f $item.Name, $env) -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "  Terminé : $ok succès, $fail échec(s)" -ForegroundColor $(if ($fail) { "Yellow" } else { "Green" })

if ($fail -gt 0) {
    Write-Host ""
    Write-Host "  Un échec signifie souvent que la variable existe déjà." -ForegroundColor DarkGray
    Write-Host "  Relancez avec -Force pour l'écraser." -ForegroundColor DarkGray
    exit 1
}

Write-Host ""
Write-Host "  Prochaine étape : vercel --prod" -ForegroundColor Cyan
