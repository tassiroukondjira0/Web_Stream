import { NextRequest } from "next/server";
import {
  EXT_BRIDGE_PATH,
  EMBED_USER_AGENT,
  isDeadEmbedDocument,
  isEmbedAssetPath,
  isEmbedDocumentAllowed,
  isExternalEmbedHost,
  isPrivateHostname,
  partnerReferer,
  rememberRuntimeHost,
  runtimeHostList,
} from "@/lib/embed-ext";
import { PLAYER_BRIDGE_SCRIPT } from "@/lib/player-bridge";
import { publicOrigin } from "@/lib/public-origin";

/**
 * Proxy document pour les embeds externes du fournisseur (uqload, voe,
 * fsvid, filemoonâ€¦).
 *
 * Ces iframes refusent le hotlink : chargÃ©es directement depuis notre page,
 * elles rÃ©pondent 403 (fsvid/voe) ou Â« fichier verrouillÃ© Â» (uqload) car le
 * rÃ©fÃ©rent est notre domaine. Ce proxy rejoue la requÃªte avec le rÃ©fÃ©rent du
 * fournisseur, rÃ©Ã©crit les URLs relatives en absolues, et injecte un
 * bootstrap qui redirige les appels runtime de l'hÃ©bergeur vers
 * `/api/embed/ext/proxy` â€” le document tournant dÃ©sormais sur notre origine.
 *
 * L'hÃ´te et le chemin de l'embed sont mÃ©morisÃ©s cÃ´tÃ© serveur (`EMBED_HOSTS`),
 * car seul un chemin peut transiter par un remplacement d'attribut `src`.
 */

const UA = EMBED_USER_AGENT;

/** URLs absolues, proto-relatives et mÃªmes-origine prÃ©sentes dans le document. */
const URL_REF = /(?:https?:)?\/\/[^"'\s)>,]+|\/(?!\/)[^"'\s)>,]+/g;

/** HÃ´tes distincts rÃ©fÃ©rencÃ©s par le document d'embed. */
function collectTargetHosts(html: string, embedHost: string): Set<string> {
  const out = new Set<string>();
  for (const m of html.matchAll(URL_REF)) {
    const raw = m[0];
    if (/^(data:|blob:|javascript:|mailto:|tel:|#)/i.test(raw)) continue;
    let abs: URL;
    try {
      abs = raw.startsWith("//")
        ? new URL(`https:${raw}`)
        : new URL(raw, `https://${embedHost}`);
    } catch {
      continue;
    }
    if (abs.protocol !== "http:" && abs.protocol !== "https:") continue;
    out.add(abs.hostname);
  }
  return out;
}

/**
 * MÃ©morise les hÃ´tes externes du document (flux vidÃ©o) et expose la table au
 * bootstrap, afin que les requÃªtes runtime vers ces hÃ´tes (ex. HLS) soient
 * rejouÃ©es via le bridge avec le bon rÃ©fÃ©rent au lieu de partir en direct.
 */
function applyRuntimeHosts(html: string, embedHost: string): string {
  for (const host of collectTargetHosts(html, embedHost)) {
    if (host !== embedHost) rememberRuntimeHost(host);
  }
  const table = JSON.stringify(runtimeHostList());
  const inject = (m: string) =>
    `${m}<script>window.__EMBED_RUNTIME_HOSTS__=${table};</script>`;
  return /<head[^>]*>/i.test(html)
    ? html.replace(/<head[^>]*>/i, inject)
    : inject("") + html;
}

/**
 * jwplayer retrouve son dossier d'installation via un tag `<script>` dont le
 * `src` contient littÃ©ralement `/jwplayer.js`. Nos URLs de bridge encodent ce
 * chemin, ce qui fait Ã©chouer `setup()` (Â« Could not locate jwplayer.js script
 * tag Â»). On ajoute un tag inerte portant l'URL d'origine pour que la dÃ©tection
 * fonctionne, sans recharger le script.
 */

/**
 * Mots-clÃ©s utilisÃ©s pour dÃ©tecter et supprimer les Ã©lÃ©ments publicitaires
 * (scripts, iframes, overlays) susceptibles de casser la lecture ou de
 * gÃ©nÃ©rer des erreurs console.
 */
const AD_KEYWORDS =
  /(ad|ads|advert|pub|popup|popunder|banner|track|analytics|beacon|click|acl|dovelet|driverhug|llvpn|displayvert|hhaedaf|hmadkix|jwcdn|googima|histats|usrpubtrck|cloudflareinsights|pedlersinswell|vpaid|vast)/i;

/** Supprime les balises/scripts/iframes publicitaires et les overlays du HTML. */
function stripAdsAndOverlays(html: string): string {
  return html
    // Supprime les <script> dont le src contient un mot-clÃ© pub/tracking
    .replace(
      /<script\b[^>]*src\s*=\s*["']([^"']*)["'][^>]*[\s\S]*?<\/script>/gi,
      (m, src) => (AD_KEYWORDS.test(src) ? "" : m),
    )
    // Supprime les <script> inline qui appellent des fonctions pub connues
    .replace(
      /<script\b[^>]*>([\s\S]*?)<\/script>/gi,
      (m, body) =>
        /runPop|aclib|popunder|popad|adblock|pushAd|showAd/i.test(body)
          ? ""
          : m,
    )
    // Supprime les <iframe> dont le src contient un mot-clÃ© pub
    .replace(
      /<iframe\b[^>]*src\s*=\s*["']([^"']*)["'][^>]*>[\s\S]*?<\/iframe>/gi,
      (m, src) => (AD_KEYWORDS.test(src) ? "" : m),
    )
    // Supprime les <iframe> sans src (souvent des placeholders pub)
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
    // Supprime les overlays/divs dont id ou classe contient un mot-clÃ© pub
    .replace(
      /<([a-zA-Z]+)\b[^>]*(?:class|id)\s*=\s*["']([^"']*)["'][^>]*>[\s\S]*?<\/\1>/gi,
      (m, tag, cls) =>
        /^(?:div|span|section|aside)$/i.test(tag) &&
        AD_KEYWORDS.test(cls)
          ? ""
          : m,
    );
}

/**
 * kokoflix/ykfrtza dÃ©duit le `filecode` de `location.pathname` pour appeler
 * `/api/stream`. Le document Ã©tant servi depuis `/api/embed/ext`, le code
 * devient Â« ext Â» et l'API rÃ©pond 400. On fige donc le code du chemin final
 * (`/e/<code>`) dans le HTML.
 */
function injectFilecode(html: string, documentPath: string, embedHost: string): string {
  if (!/(^|\.)(kokoflix|ykfrtza)\./i.test(embedHost)) return html;
  const m = documentPath.match(/\/e\/([A-Za-z0-9_-]{4,})/);
  if (!m) return html;
  return html.replace(/getFilecodeFromURL\(\)/g, JSON.stringify(m[1]));
}

function injectJwplayerBase(html: string, sourceHtml: string, embedHost: string): string {
  const m = sourceHtml.match(
    /<script[^>]+src\s*=\s*["']([^"']*\/jwplayer\.js(?:[?#][^"']*)?)["']/i,
  );
  if (!m) return html;
  let abs: URL;
  try {
    abs = new URL(m[1], `https://${embedHost}`);
  } catch {
    return html;
  }
  const tag = `<script type="application/x-embed-base" src="${abs.origin}${abs.pathname}"></script>`;
  return /<head[^>]*>/i.test(html)
    ? html.replace(/<head[^>]*>/i, (h) => `${h}${tag}`)
    : `${tag}${html}`;
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("u");
  if (!raw) {
    return new Response("ParamÃ¨tre manquant : u", { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response("URL invalide", { status: 400 });
  }
  if (
    !/^https?:$/.test(target.protocol) ||
    isPrivateHostname(target.hostname) ||
    !isEmbedDocumentAllowed(target.href, request.nextUrl.searchParams.get("s"))
  ) {
    return new Response("Domaine non autorisÃ©", { status: 403 });
  }

  const fetched = await fetchExternalDocumentSafe(target.href, UA);
  if (!fetched) {
    return unavailablePage(
      "L'hÃ©bergeur ne rÃ©pond pas. Choisissez une autre source dans le menu.",
    );
  }

  const embedHost = fetched.host;
  const documentPath = fetched.path;
  // HÃ´te final du document (aprÃ¨s redirections Ã©ventuelles) : le proxy
  // runtime doit pouvoir relayer ses ressources mÃªme s'il n'est pas dans
  // l'allowlist statique (nouvel hÃ©bergeur signÃ©).
  rememberRuntimeHost(embedHost);
  // Les URLs du bridge doivent Ãªtre absolues : le document proxifiÃ© porte un
  // `<base href="https://hÃ©bergeur/...">`, donc un chemin racine relatif
  // (`/api/embed/ext/proxy`) serait rÃ©solu contre le domaine de l'hÃ©bergeur.
  const proxyOrigin = publicOrigin(request);
  const bridge = (path: string): string =>
    `${proxyOrigin}${EXT_BRIDGE_PATH}?h=${encodeURIComponent(embedHost)}&p=${encodeURIComponent(path)}&r=${encodeURIComponent(documentPath)}`;

  // Nettoie les scripts/iframes/overlays publicitaires avant rÃ©Ã©criture
  const cleanedHtml = stripAdsAndOverlays(fetched.html);
  const html = injectFilecode(
    injectJwplayerBase(
      applyRuntimeHosts(rewriteHtml(cleanedHtml, bridge, embedHost, proxyOrigin), embedHost),
      fetched.html,
      embedHost,
    ),
    documentPath,
    embedHost,
  );
  const bootstrap = buildBootstrap(embedHost, documentPath, proxyOrigin);
  const baseTag = `<base href="https://${embedHost}${documentPath}">`;
  // Injecte le CSS anti-overlay dans le <head> pour masquer les pubs
  const body = /<head[^>]*>/i.test(html)
    ? html.replace(/<head[^>]*>/i, (m) => `${m}${AD_HIDE_CSS}${baseTag}${bootstrap}`)
    : `${AD_HIDE_CSS}${baseTag}${bootstrap}${html}`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Embed-Host": embedHost,
      "Referrer-Policy": "no-referrer",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

/** RÃ©cupÃ¨re le document d'embed (texte HTML) avec le bon rÃ©fÃ©rent. */
async function fetchExternalDocumentSafe(
  url: string,
  ua: string,
): Promise<{
  html: string;
  host: string;
  path: string;
} | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": ua,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        Referer: partnerReferer(),
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const finalUrl = res.url || url;
    const html = await res.text();
    if (html.length < 100 || isDeadEmbedDocument(html)) return null;
    const u = new URL(finalUrl);
    return { html, host: u.hostname, path: u.pathname + u.search };
  } catch {
    return null;
  }
}

/**
 * RÃ©Ã©crit les URLs relatives du HTML :
 *  - les ressources Â« same-origin Â» de l'hÃ©bergeur (ex. `/assets/x.js`,
 *    `/api/â€¦`) deviennent des URL bridge vers `/api/embed/ext/proxy`, qui
 *    les rejoue vers l'hÃ´te ;
 *  - les URLs absolues vers l'hÃ©bergeur passent aussi par le bridge ;
 *  - les autres URLs restent inchangÃ©es.
 */
function rewriteHtml(
  html: string,
  bridge: (path: string) => string,
  embedHost: string,
  proxyOrigin: string,
): string {
  const rewriteValue = (value: string): string | null => {
    if (!value || /^(data:|blob:|about:|javascript:|mailto:|tel:|#)/i.test(value)) return null;
    // RÃ©soudre toute URL (relative ou absolue) par rapport Ã  l'hÃ©bergeur, puis
    // la faire passer par notre proxy pour Ã©viter les erreurs CORS/Referer.
    let abs: URL;
    try {
      abs = new URL(value, `https://${embedHost}/`);
    } catch {
      return null;
    }
    if (abs.protocol !== "http:" && abs.protocol !== "https:") return null;
    // DÃ©jÃ  une URL de proxy : ne pas rÃ©Ã©crire une seconde fois.
    if (abs.pathname.indexOf("/api/embed/ext/proxy") === 0) return null;
    // URL vers notre propre domaine : ne pas rÃ©Ã©crire.
    try {
      const originUrl = new URL(proxyOrigin);
      if (abs.hostname === originUrl.hostname) return null;
    } catch {}
    // URL vers l'hÃ©bergeur : mode bridge (chemin relatif sur l'hÃ´te).
    if (abs.hostname === embedHost) {
      return bridge(abs.pathname + abs.search);
    }
    // URL absolue vers un autre domaine externe (CDN, API de streaming, etc.) :
    // mode absolu du proxy avec le bon rÃ©fÃ©rent (h = hÃ©bergeur du document).
    return `${proxyOrigin}${EXT_BRIDGE_PATH}?u=${encodeURIComponent(abs.href)}&h=${encodeURIComponent(embedHost)}`;
  };

  return html.replace(
    /\b(src|href|poster|data|action)\s*=\s*(["'])([^"']*)\2/gi,
    (m, attr, quote, value) => {
      if (attr.toLowerCase() === "href") return m;
      const rewritten = rewriteValue(value);
      return rewritten ? `${attr}=${quote}${rewritten}${quote}` : m;
    },
  );
}

/** Injecte le stockage mÃ©moire + le bootstrap de rÃ©Ã©criture runtime. */
function buildBootstrap(embedHost: string, documentPath: string, proxyOrigin: string): string {
  return `${STORAGE_SHIM}${PLAYER_BRIDGE_SCRIPT}<script>(function(){
var HOST=${JSON.stringify(embedHost)};
var PATH=${JSON.stringify(documentPath)};
var ORIGIN=${JSON.stringify(proxyOrigin)};
var BH="https://"+HOST;
var PROXY=ORIGIN+"/api/embed/ext/proxy?u=";
var BRIDGE=ORIGIN+"/api/embed/ext/proxy";
var RHOSTS=window.__EMBED_RUNTIME_HOSTS__||[];
// fsvid chiffre sa source HLS avec une clÃ© dÃ©rivÃ©e de location.hostname.
// Servie depuis notre origine, la page ne peut pas la dÃ©chiffrer et retombe
// sur la dÃ©mo /troll/. On corrige le code dÃ©paquetÃ© avant son eval.
if(${JSON.stringify(/(^|\.)fsvid\./i.test(embedHost))}){
  var _ev=window.eval;
  window.eval=function(c){
    if(typeof c==="string"&&c.indexOf("location&&location.hostname")>=0){
      c=c.replace(/\\(location&&location\\.hostname\\)/g,JSON.stringify(HOST));
    }
    return _ev.call(this,c);
  };
}
var BASE=HOST.split(".").slice(-2).join(".");
function isRuntimeHost(h){return h===HOST||RHOSTS.indexOf(h)>=0;}
function isFamilyHost(h){return h===HOST||h.slice(-(BASE.length+1))==="."+BASE;}
function proxyUrl(u){return PROXY+encodeURIComponent(u)+"&h="+encodeURIComponent(HOST);}
function bridge(p,q){
  var r=BRIDGE+"?h="+encodeURIComponent(HOST)+"&p="+encodeURIComponent(p)+(q?"&q="+encodeURIComponent(q):"")+"&r="+encodeURIComponent(PATH);
  return r;
}
function withGk(u){
  try{
    if(!window.__vzgk||!/(^|\.)fsvid\./i.test(HOST))return u;
    var a=new URL(u);
    if(a.pathname.indexOf("/api/embed/ext/proxy")!==0)return u;
    if(!a.searchParams.get("gk"))a.searchParams.set("gk",window.__vzgk);
    return a.href;
  }catch(e){return u;}
}
function map(u){
  if(typeof u!=="string"||!u)return null;
  // URL de bridge dÃ©jÃ  absolue : ne pas la rÃ©Ã©crire une seconde fois.
  if(u.indexOf("/api/embed/ext/proxy")===0)return withGk(u);
  if(u.indexOf(location.origin)===0)return null;
  var a;try{
    // Proto-relative (//cdn.example.com/x.js) : rÃ©solu contre l'hÃ´te de l'embed
    if(u.charAt(0)==="/"&&u.charAt(1)==="/")a=new URL("https:"+u);
    else a=new URL(u,BH+PATH);
  }catch(e){return null;}
  if(a.protocol!=="http:"&&a.protocol!=="https:")return null;
  if(a.hostname===location.hostname)return null;
  if(a.origin===location.origin)return bridge(a.pathname,a.search.slice(1));
  if(a.hostname===HOST)return bridge(a.pathname,a.search.slice(1));
  // Toutes les autres URLs externes (CDN, API des lecteurs, sous-domaines) :
  // on les fait passer par le proxy absolu avec le bon hÃ´te/referer.
  return withGk(proxyUrl(a.href));
}
// Corps de requÃªte (joueurs protÃ©gÃ©s style filemoon/voe) : rÃ©Ã©crit les URLs
// absolues de l'hÃ©bergeur ou des hÃ´tes runtime qu'il contient.
function mapBody(body){
  if(typeof body!=="string"||body.indexOf("http")<0)return body;
  return body.replace(/https?:\\/\\/[^"'\\s&<]+/g,function(u){
    try{var a=new URL(u);if(a.hostname===location.hostname||a.hostname===HOST)return u;if(a.origin===location.origin)return u;return withGk(proxyUrl(u));}catch(e){return u;}
    return u;
  });
}
var of_=window.fetch;
if(of_)window.fetch=function(input,init){
  try{
    if(typeof input==="string"){
      var m=map(input);
      if(m)return of_.call(this,m,init);
    }else if(input&&typeof input==="object"&&typeof input.url==="string"){
      var m2=map(input.url);
      if(m2){
        try{
          return of_.call(this,new Request(m2,{
            method:input.method,headers:input.headers,
            body:(input.method==="GET"||input.method==="HEAD")?undefined:input.body,
            credentials:input.credentials,cache:input.cache,
            redirect:input.redirect,signal:input.signal}));
        }catch(e){return of_.call(this,m2,init);}
      }
    }
    if(init&&typeof init.body==="string"){
      var nb=mapBody(init.body);
      if(nb!==init.body){var ni={};for(var k in init)ni[k]=init[k];ni.body=nb;return of_.call(this,input,ni);}
    }
  }catch(e){}
  return of_.apply(this,arguments);
};
var XP=XMLHttpRequest.prototype,oo=XP.open,os=XP.send;
XP.open=function(){
  var args=Array.prototype.slice.call(arguments);
  try{
    if(typeof args[1]==="string"){var m=map(args[1]);if(m)args[1]=m;}
  }catch(e){}
  return oo.apply(this,args);
};
XP.send=function(body){
  try{
    if(typeof body==="string"){var nb=mapBody(body);if(nb!==body)body=nb;}
  }catch(e){}
  return os.call(this,body);
};
if(navigator.sendBeacon){
  var ob=navigator.sendBeacon.bind(navigator);
  navigator.sendBeacon=function(url,data){
    var m=map(typeof url==="string"?url:"");
    return m?ob(m,data):ob(url,data);
  };
}
var fakeWin={closed:false,name:"",opener:null,frames:[],length:0,
  location:{href:"",assign:function(){},replace:function(){},reload:function(){}},
  document:{write:function(){},writeln:function(){},open:function(){},close:function(){},
    body:{appendChild:function(){},removeChild:function(){},style:{}},
    documentElement:{style:{}},
    createElement:function(){return{style:{},setAttribute:function(){},appendChild:function(){}};}},
  focus:function(){},blur:function(){},close:function(){},postMessage:function(){},
  addEventListener:function(){},removeEventListener:function(){}};
function allowed(h){return h===HOST||h===location.hostname;}
var owo=window.open;
window.open=function(u){
  try{
    var a=new URL(String(u),BH+PATH);
    if(a.protocol!=="http:"&&a.protocol!=="https:")return fakeWin;
    if(!allowed(a.hostname))return fakeWin;
  }catch(e){return fakeWin;}
  return owo.apply(window,arguments);
};
var oac=HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click=function(){
  try{
    var a=new URL(this.href,BH+PATH);
    if((a.protocol==="http:"||a.protocol==="https:")&&!allowed(a.hostname))return;
  }catch(e){}
  return oac.apply(this,arguments);
};
})();</script>`;
}

const STORAGE_SHIM = `<script>(function(){
try{
  var testKey = "__st_test__";
  window.localStorage.setItem(testKey, "1");
  window.localStorage.removeItem(testKey);
}catch(e){
  try{
    function mk(){var d={};return{_d:d,getItem:function(k){return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null;},setItem:function(k,v){d[k]=String(v);},removeItem:function(k){delete d[k];},clear:function(){for(var k in d)delete d[k];},key:function(i){return Object.keys(d)[i]||null;},get length(){return Object.keys(d).length;}};}
    Object.defineProperty(window,"localStorage",{value:mk(),configurable:true,writable:true});
    Object.defineProperty(window,"sessionStorage",{value:mk(),configurable:true,writable:true});
  }catch(e2){}
}
try{
  var jar="";
  Object.defineProperty(document,"cookie",{configurable:true,get:function(){return jar;},set:function(v){var p=String(v).split(";")[0];if(p&&p.indexOf("=")>0){jar=jar?jar+"; "+p:p;}}});
}catch(e){}
// Certains lecteurs (kokoflix/ykfrtza) detectent l'attribut sandbox de notre
// iframe et se redirigent vers /sandboxed.html, qui n'existe pas. On masque
// uniquement cette detection, pas le sandbox lui-meme.
try{
  var ha=Element.prototype.hasAttribute;
  Element.prototype.hasAttribute=function(n){
    try{if(String(n).toLowerCase()==="sandbox"&&window.frameElement&&this===window.frameElement)return false;}catch(e){}
    return ha.apply(this,arguments);
  };
}catch(e){}
// Meme detection via l'affectation de document.domain.
try{
  var dd=Object.getOwnPropertyDescriptor(Document.prototype,"domain");
  if(dd&&dd.set){Object.defineProperty(document,"domain",{configurable:true,get:function(){try{return dd.get?dd.get.call(document):location.hostname;}catch(e){return location.hostname;}},set:function(){}});}
}catch(e){}
// Certains hÃ©bergeurs vÃ©rifient window.top/self/parent/frameElement.
try{
  Object.defineProperty(window,"frameElement",{configurable:true,get:function(){return null;}});
}catch(e){}
try{window.parent=window;}catch(e){}
try{window.top=window;}catch(e){}
try{window.self=window;}catch(e){}
// navigator.webdriver (dÃ©tection automation)
try{Object.defineProperty(navigator,"webdriver",{configurable:true,get:function(){return false;}});}catch(e){}
// Dimensions de fenÃªtre simulÃ©es pour Ã©viter la dÃ©tection iframe rÃ©duit
try{Object.defineProperty(window,"outerHeight",{configurable:true,get:function(){return 768;}});}catch(e){}
try{Object.defineProperty(window,"outerWidth",{configurable:true,get:function(){return 1024;}});}catch(e){}
// Plugins et langues simulÃ©s
try{Object.defineProperty(navigator,"plugins",{configurable:true,get:function(){return [];}});}catch(e){}
try{Object.defineProperty(navigator,"languages",{configurable:true,get:function(){return ["fr-FR","fr"];}});}catch(e){}
try{Object.defineProperty(navigator,"platform",{configurable:true,get:function(){return "Win32";}});}catch(e){}
try{Object.defineProperty(navigator,"hardwareConcurrency",{configurable:true,get:function(){return 4;}});}catch(e){}
// Stubs pour les fonctions publicitaires afin d'Ã©viter les erreurs JS
// (ex. "aclib.runPop is not a function") qui bloquent le dÃ©marrage du lecteur.
try{window.aclib=window.aclib||{};window.aclib.runPop=window.aclib.runPop||function(){};window.aclib.runPopUnder=window.aclib.runPopUnder||function(){};}catch(e){}
try{window.runPop=window.runPop||function(){};}catch(e){}
try{window.popunder=window.popunder||function(){};}catch(e){}
try{window.showAd=window.showAd||function(){};}catch(e){}
try{window.pushAd=window.pushAd||function(){};}catch(e){}
// Intercepter fetch pour rediriger les appels externes vers notre proxy
// (bon referer, contournement CORS, proxy des flux et API des hÃ©bergeurs).
try{
  var _fetch=window.fetch;
  window.fetch=function(input,init){
    try{
      var url=typeof input==="string"?input:(input&&(input.href||input.url)?(input.href||input.url):String(input));
      if(url&&url.indexOf("http")===0){
        var u=new URL(url);
        if(u.hostname===location.hostname)return _fetch.apply(this,arguments);
        if(url.indexOf("/api/embed/ext/proxy?u=")>=0)return _fetch.apply(this,arguments);
        return _fetch.call(this,location.origin+"/api/embed/ext/proxy?u="+encodeURIComponent(url),init||{});
      }
    }catch(e){}
    return _fetch.apply(this,arguments);
  };
}catch(e){}
})();</script>`;

/** CSS injectÃ© pour masquer les overlays publicitaires courants. */
const AD_HIDE_CSS = `<style>
[id*="ad" i],[class*="ad" i],[id*="pub" i],[class*="pub" i],
[id*="overlay" i],[class*="overlay" i],[id*="popup" i],[class*="popup" i],
[id*="banner" i],[class*="banner" i],[id*="lock" i],[class*="lock" i],
[class*="acl" i],[class*="dovelet" i],[class*="driverhug" i],
[class*="llvpn" i],[class*="displayvert" i],[class*="hhaedaf" i],
[class*="hmadkix" i],[id*="locked" i],[class*="locked" i],
[class*="premium-lock" i],[class*="premiumlock" i] {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
  position: static !important;
  z-index: auto !important;
  width: auto !important;
  height: auto !important;
  opacity: 0 !important;
  overflow: visible !important;
}
body { overflow: auto !important; }
</style>`;

function unavailablePage(message: string): Response {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Source indisponible</title>
<style>html,body{height:100%;margin:0}body{background:#09090b;color:#e4e4e7;display:flex;align-items:center;justify-content:center;font:14px/1.5 system-ui,sans-serif}div{text-align:center;padding:24px}p{margin:8px 0 0;color:#a1a1aa}</style>
</head><body><div><strong>Source indisponible</strong><p>${message}</p></div></body></html>`;
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
