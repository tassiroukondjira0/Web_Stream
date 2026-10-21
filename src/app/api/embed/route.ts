import { NextRequest } from "next/server";

/**
 * Proxy d'embed Vidzy avec injection du token `gk`.
 *
 * Le lecteur Vidzy appelle `gate.php` pour obtenir un token `gk` qui autorise
 * les segments HLS. Quand l'embed est intégré depuis notre domaine, le gate
 * retourne `{"ok":0}` (domaine non whitelisté) et le CDN rejette les segments
 * après ~90 s de grâce → stall de lecture.
 *
 * Ce proxy résout le problème en deux étapes :
 * 1. Côté serveur, on appelle `gate.php` avec des paramètres whitelistés
 *    (`ft=TOP`, headers `vidzy.org`) pour obtenir un `gk` valide.
 * 2. On récupère le HTML d'embed et on injecte `window.__vzgk='{gk}'` AVANT
 *    les scripts. Le code interne de l'embed fait
 *    `if(j&&j.gk){window.__vzgk=j.gk;}` — quand le gate retourne `ok:0`
 *    (pas de `gk`), notre valeur pré-injectée n'est **pas surchargée**.
 *    La fonction `addGk()` l'ajoute ensuite aux URLs HLS → lecture continue.
 */

const VIDZY_BASE = "https://vidzy.org";
const GATE_URL = "https://v6.vidzy.cc/gate.php";
const REQUEST_TIMEOUT_MS = 8000;
const GK_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 h (le token expire à 24 h)

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Cache en mémoire pour le gk (valable ~24 h côté Vidzy).
let cachedGk: { value: string; ts: number } | null = null;

/** Récupère un token `gk` valide en interrogeant gate.php avec des param whitelistés. */
async function fetchGk(): Promise<string | null> {
  if (cachedGk && Date.now() - cachedGk.ts < GK_CACHE_TTL_MS) {
    return cachedGk.value;
  }
  try {
    const params = new URLSearchParams({
      v: "p1",
      cw: "1234.56",
      cw2: "1234.56",
      wg: "1",
      dpr: "1",
      sw: "1920",
      hw: "8",
      ft: "TOP",
      rf: "",
    });
    const res = await fetch(`${GATE_URL}?${params}`, {
      headers: {
        "User-Agent": UA,
        Accept: "*/*",
        Referer: `${VIDZY_BASE}/`,
        Origin: VIDZY_BASE,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: number; gk?: string };
    if (data.ok === 1 && typeof data.gk === "string" && data.gk.length > 0) {
      cachedGk = { value: data.gk, ts: Date.now() };
      return data.gk;
    }
    return null;
  } catch {
    return null;
  }
}

/** Récupère le HTML d'une page Vidzy avec les headers appropriés. */
async function fetchVidzyHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,*/*",
        Referer: `${VIDZY_BASE}/`,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Extrait l'URL d'embed réelle depuis la page wrapper Vidzy.
 * La page wrapper contient un `<iframe src="https://vidzy.xx/embed-xxx.html">`.
 */
function extractEmbedUrl(wrapperHtml: string): string | null {
  const match = wrapperHtml.match(
    /<iframe[^>]+src\s*=\s*["']([^"']*embed[^"']*)["']/i,
  );
  return match?.[1] ?? null;
}

/**
 * Réécrit les URLs relatives du HTML d'embed en URLs absolues pointant vers
 * le domaine de l'embed. Sans cela, les ressources (`/js/…`, `/css/…`)
 * résoudraient vers notre propre domaine et renverraient 404.
 */
function rewriteRelativeUrls(html: string, baseUrl: string): string {
  const origin = new URL(baseUrl).origin;
  return html
    .replace(/(href|src)\s*=\s*(["'])\/(?!\/)/gi, `$1=$2${origin}/`)
    .replace(/url\(\s*(["']?)\/(?!\/)/gi, `url($1${origin}/`)
    .replace(/(['"])\/(js|css|videojs|img|fonts)\//gi, `$1${origin}/$2/`);
}

/**
 * Corrige le décodeur d'URL de stream Vidzy.
 *
 * L'embed décode l'URL HLS réelle (base64 + reverse + XOR) avec une clé
 * dépendant de `location.hostname` (somme des charcodes & 255) et d'une
 * mesure CSS (`1in+54px` − 32px = 118). Le payload est encodé pour
 * `vidzy.cc` (H=42 → 42+118 ≡ 160 mod 256). Depuis notre origine
 * (H≠42), le décodage échoue et l'embed retombe sur le flux « troll »
 * de 18 s. On fige la clé sur `vidzy.cc` : le décodeur produit la vraie
 * URL quel que soit notre domaine.
 */
function fixDecoderHostname(html: string): string {
  return html
    .split('var h=(location&&location.hostname)||""')
    .join('var h="vidzy.cc"');
}

/**
 * Supprime les tags de scripts publicitaires injectés par l'embed :
 * popunder (vidzy.cc/js/popunder-inject.js), réseaux (runative-syndicate,
 * dtscout, crwdcntrl, bursdeejays…). Ces scripts posent le calque
 * `#dontfoid` et ouvrent des onglets externes au clic. Leur retrait côté
 * serveur est plus fiable qu'une neutralisation runtime.
 */
function stripAdScripts(html: string): string {
  return html.replace(
    /<script\b[^>]*\bsrc\s*=\s*(["'])[^"']*(bursdeejays|runative-syndicate|popunder-inject|dtscout|crwdcntrl)[^"']*\1[^>]*>\s*<\/script>/gi,
    "",
  );
}

/** Injecte le gk + le bootstrap de réécriture des appels runtime. */
function injectBootstrap(html: string, embOrigin: string, gk: string | null): string {
  const gkScript = gk ? `<script>window.__vzgk=${JSON.stringify(gk)};</script>` : "";
  // L'iframe est sandboxée SANS allow-same-origin (origine opaque → les
  // requêtes sortent avec `Origin: null`, accepté par le CDN). Mais une
  // origine opaque interdit aussi localStorage/sessionStorage/document.cookie :
  // le code Vidzy (videojs, plugins, SDKs) lève alors un SecurityError non
  // catché et le lecteur ne démarre pas. On pose des shims mémoire avant
  // tout autre script.
  const storageShim = `<script>(function(){
try{
  function mk(){var d={};return{_d:d,getItem:function(k){return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null;},setItem:function(k,v){d[k]=String(v);},removeItem:function(k){delete d[k];},clear:function(){for(var k in d)delete d[k];},key:function(i){return Object.keys(d)[i]||null;},get length(){return Object.keys(d).length;}};}
  Object.defineProperty(window,"localStorage",{value:mk(),configurable:true,writable:true});
  Object.defineProperty(window,"sessionStorage",{value:mk(),configurable:true,writable:true});
}catch(e){}
try{
  var jar="";
  Object.defineProperty(document,"cookie",{configurable:true,get:function(){return jar;},set:function(v){var p=String(v).split(";")[0];if(p&&p.indexOf("=")>0){jar=jar?jar+"; "+p:p;}}});
}catch(e){}
})();</script>`;
  // Désamorce les kill-switches Vidzy :
  //  - `__fssSbx` : ne s'active QUE dans une iframe sandboxée (origine
  //    opaque, `origin==="null"`) dont le parent n'est pas un partenaire
  //    whiteliste → boucle `kill()` qui vide le <video> toutes les 250ms
  //    + overlay "Lecture indisponible" ;
  //  - `__fssPop` : armé si le parent n'est pas whiteliste → `block()`
  //    (même destruction) dès qu'un `window.open` échoue <900ms après un
  //    geste utilisateur.
  // Les deux scripts commencent par `if(window.__fssX)return;` : il suffit
  // de pré-positionner les flags avant tout autre script.
  const killSwitchShim = `<script>window.__fssSbx=1;window.__fssPop=1;</script>`;
  // Le module PopUnder de l'embed (`vidzy.cc/<hash>.js` →
  // `PopUnder.tryToAttachFullOverlay`) pose un calque transparent plein écran
  // `<div id="dontfoid" style="position:fixed;z-index:2147483647">` au-dessus
  // du lecteur : tous les clics sont absorbés (la lecture ne démarre jamais
  // au clic) et un MutationObserver le ré-attache s'il est retiré. On neutralise
  // l'interception en CSS (élément conservé, anti-tamper du code Vidzy aveugle)
  // plutôt qu'en le supprimant.
  const overlayShim = `<style>#dontfoid,#adbd,#play_limit_box,[znid]{pointer-events:none!important}[style*="2147483647"]{pointer-events:none!important}</style>`;
  // L'embed Vidzy embarque DEUX interfaces de lecteur au-dessus de la même
  // balise <video> :
  //  - le skin legacy FMovies (`#fm-*`) : barre de contrôle + gros bouton
  //    play centré, câblé (listeners click réels) — c'est celui que l'on voit ;
  //  - le skin video.js/nuevo (`#vjs-*`) : `.vjs-control-bar` réduite à
  //    0 px de haut (hors cadre, `vjs-null`) et gros bouton play en
  //    `display:none` — le skin est là mais replié, et peut se redéplier par
  //   -dessus le skin legacy au premier survol/interaction.
  // Résultat à l'écran : deux lecteurs superposés (deux barres de contrôle,
  // deux boutons play). On masque donc le chrome video.js et on ne garde que
  // le skin legacy, qui est le seul à réagir aux clics ; video.js conserve
  // la gestion du flux HLS (le <video> lui appartient toujours).
  const playerUiShim = `<style>.vjs-control-bar,.vjs-big-play-button,.vjs-poster,.vjs-overlay,.vjs-modal-dialog{display:none!important}</style>`;
  // Bootstrap : le document d'embed tourne sur notre origine, alors que son
  // code suppose être sur vidzy.xx. On réécrit les appels runtime :
  //  - URLs root-relative (`/js/domain.txt`) → origine de l'embed ;
  //  - endpoints Vidzy sans CORS (gate.php, js/*, api/*…) → `/api/embed/proxy` ;
  //  - média CDN (.m3u8/.ts…, ACAO `*`) → en direct SANS credentials
  //    (videojs Vhs.xhr.beforeRequest force withCredentials=true ce qui fait
  //    échouer la vérification CORS wildcard).
  const boot = `<script>(function(){
var EMB=${JSON.stringify(embOrigin)};
var PROXY="/api/embed/proxy?u=";
var MEDIA=/\\.(m3u8|m3u|ts|m4s|mp4|m4a|webm|aac|mp3|ogg|ogv|jpg|jpeg|png|gif|webp|vtt|woff2?)(\\?|#|$)/i;
function isVidzy(h){return /(^|\\.)vidzy\\./i.test(h);}
function map(u){
  if(typeof u!=="string"||!u)return null;
  var a;try{a=new URL(u,location.href);}catch(e){return null;}
  if(a.protocol!=="http:"&&a.protocol!=="https:")return null;
  if(a.origin===location.origin){try{a=new URL(a.pathname+a.search+a.hash,EMB);}catch(e){return null;}}
  if(!isVidzy(a.hostname))return null;
  if(MEDIA.test(a.pathname))return{u:a.href,nc:1};
  return{u:PROXY+encodeURIComponent(a.href),nc:0};
}
var of_=window.fetch;
if(of_)window.fetch=function(input,init){
  try{
    if(typeof input==="string"){
      var m=map(input);
      if(m){var i=init;if(m.nc)i=Object.assign({},init||{},{credentials:"omit"});return of_.call(this,m.u,i);}
    }else if(input&&typeof input==="object"&&typeof input.url==="string"){
      var m2=map(input.url);
      if(m2){
        try{
          return of_.call(this,new Request(m2.u,{
            method:input.method,headers:input.headers,
            body:(input.method==="GET"||input.method==="HEAD")?undefined:input.body,
            credentials:m2.nc?"omit":input.credentials,
            cache:input.cache,redirect:input.redirect,signal:input.signal}));
        }catch(e){var i2=init||{};if(m2.nc)i2=Object.assign({},i2,{credentials:"omit"});return of_.call(this,m2.u,i2);}
      }
    }
  }catch(e){}
  return of_.apply(this,arguments);
};
var XP=XMLHttpRequest.prototype,oo=XP.open,os=XP.send;
XP.open=function(){
  var args=Array.prototype.slice.call(arguments);
  try{
    if(typeof args[1]==="string"){var m=map(args[1]);if(m){args[1]=m.u;this.__vzc=m.nc?1:0;}}
  }catch(e){}
  return oo.apply(this,args);
};
XP.send=function(){
  if(this.__vzc){try{this.withCredentials=false;}catch(e){}}
  return os.apply(this,arguments);
};
if(navigator.sendBeacon){
  var ob=navigator.sendBeacon.bind(navigator);
  navigator.sendBeacon=function(url,data){
    var m=map(typeof url==="string"?url:"");
    return m?ob(m.u,data):ob(url,data);
  };
}
// Anti pop-under : le module PopUnder de l'embed ('#ke'/'_0x591839' dans
// vidzy.cc/<hash>.js) et les SDKs publicitaires (runative-syndicate…)
// appellent window.open au clic sur le lecteur → onglet 'about:blank'
// redirigé vers une page externe (ex. best.aliexpress.com). On renvoie une
// fenêtre factice inerte (les appelants ne lèvent pas d'erreur), en laissant
// passer les URLs Vidzy (bouton Télécharger, page API).
var fakeWin={closed:false,name:"",opener:null,frames:[],length:0,
  location:{href:"",assign:function(){},replace:function(){},reload:function(){}},
  document:{write:function(){},writeln:function(){},open:function(){},close:function(){},
    body:{appendChild:function(){},removeChild:function(){},style:{}},
    documentElement:{style:{}},
    createElement:function(){return{style:{},setAttribute:function(){},appendChild:function(){}};}},
  focus:function(){},blur:function(){},close:function(){},postMessage:function(){},
  addEventListener:function(){},removeEventListener:function(){}};
function isVidzyHost(h){return /(^|\\.)vidzy\\./i.test(h)||h===location.hostname;}
var owo=window.open;
window.open=function(u){
  try{
    var a=new URL(String(u),location.href);
    if(a.protocol!=="http:"&&a.protocol!=="https:")return fakeWin;
    if(!isVidzyHost(a.hostname))return fakeWin;
  }catch(e){return fakeWin;}
  return owo.apply(window,arguments);
};
var oac=HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click=function(){
  try{
    var a=new URL(this.href,location.href);
    if((a.protocol==="http:"||a.protocol==="https:")&&!isVidzyHost(a.hostname))return;
  }catch(e){}
  return oac.apply(this,arguments);
};
// Neutralise les iframes publicitaires (dtscout, crwdcntrl, runative…).
function dropAdFrames(node){
  if(!node||node.nodeType!==1)return;
  var list=node.tagName==="IFRAME"?[node]:(node.querySelectorAll?node.querySelectorAll("iframe"):[]);
  Array.prototype.forEach.call(list,function(f){
    try{
      var s=(f.getAttribute("src")||"").trim();
      if(!s||/^(about:blank|javascript:|data:|blob:)/i.test(s))return;
      var a=new URL(s,location.href);
      if(!isVidzyHost(a.hostname))f.remove();
    }catch(e){}
  });
}
new MutationObserver(function(ms){
  ms.forEach(function(m){Array.prototype.forEach.call(m.addedNodes,dropAdFrames);});
}).observe(document.documentElement,{childList:true,subtree:true});
Array.prototype.forEach.call(document.querySelectorAll("iframe"),dropAdFrames);
// Filet de sécurité lecture : le handler du skin (toggle) et celui de videojs
// peuvent se neutraliser (play puis pause immédiate, t≈0). Si un clic
// utilisateur visait à lancer la lecture et que la vidéo est toujours en
// pause 300 ms après, on relance une fois.
document.addEventListener("click",function(e){
  var v=document.querySelector("video");
  if(!v||!v.paused)return;
  var t=e.target;
  var area=t&&t.closest?t.closest("#fm-cplay,#fm-pp,.fm-center"):null;
  var surf=t&&t.tagName==="VIDEO"?t:null;
  if(!area&&!surf)return;
  setTimeout(function(){
    try{
      var pl=window.videojs&&window.videojs.getPlayers?window.videojs.getPlayers():null;
      var k=pl?Object.keys(pl)[0]:null;
      var player=k?pl[k]:null;
      if(player&&player.paused())player.play();
    }catch(err){}
  },300);
},true);
})();</script>`;
  const combined = gkScript + killSwitchShim + overlayShim + playerUiShim + storageShim + boot;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}${combined}`);
  }
  return combined + html;
}

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get("src");
  if (!src) {
    return new Response("Paramètre manquant : src", { status: 400 });
  }

  // Valider que l'URL source est bien un domaine Vidzy.
  let wrapperUrl: URL;
  try {
    wrapperUrl = new URL(src);
  } catch {
    return new Response("URL invalide", { status: 400 });
  }
  if (!/(^|\.)vidzy\./i.test(wrapperUrl.hostname)) {
    return new Response("Domaine non autorisé", { status: 403 });
  }

  // 1. Résoudre l'URL d'embed réelle. Si l'URL fournie EST déjà une page
  // d'embed (cas des iframes bruts du partenaire), on l'utilise telle quelle.
  let embedUrl: string;
  if (/embed/i.test(wrapperUrl.pathname)) {
    embedUrl = wrapperUrl.href;
  } else {
    const wrapperHtml = await fetchVidzyHtml(wrapperUrl.href);
    if (!wrapperHtml) {
      return new Response("Page wrapper indisponible", { status: 502 });
    }
    const extracted = extractEmbedUrl(wrapperHtml);
    if (!extracted) {
      return new Response("Embed introuvable", { status: 502 });
    }
    try {
      embedUrl = new URL(extracted, wrapperUrl).href;
    } catch {
      return new Response("URL d'embed invalide", { status: 502 });
    }
  }

  // 2. Récupérer le token gk (whitelisté côté serveur).
  const gk = await fetchGk();

  // 3. Récupérer le HTML de l'embed.
  const embedHtml = await fetchVidzyHtml(embedUrl);
  if (!embedHtml) {
    return new Response("Embed indisponible", { status: 502 });
  }

  // 4. Réécrire les URLs relatives, corriger le décodeur, injecter gk + bootstrap.
  let html = rewriteRelativeUrls(embedHtml, embedUrl);
  html = stripAdScripts(html);
  html = fixDecoderHostname(html);
  const embOrigin = new URL(embedUrl).origin;
  html = injectBootstrap(html, embOrigin, gk);

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
