# Dossier de téléchargement APK

Placez ici votre fichier APK signé :

```
public/downloads/cinemax.apk
```

## Comment générer l'APK

1. Ouvrez Android Studio : `npm run cap:android`
2. **Build > Generate Signed Bundle / APK > APK**
3. Créez ou sélectionnez votre keystore de signature
4. Générez l'APK en mode **release**
5. Copiez le fichier `app-release.apk` ici et renommez-le `cinemax.apk`

## Taille maximale recommandée

Les fichiers dans `public/` sont servis en statique par Next.js/Render.
Pour un APK volumineux (> 50 MB), envisagez d'utiliser un CDN ou un stockage
externe (S3, R2, etc.) et modifiez l'URL dans `AndroidAppBanner.tsx`.
