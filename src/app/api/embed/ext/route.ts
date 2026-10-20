import { NextRequest } from "next/server";
import {
  EXT_BRIDGE_PATH,
  EXT_PROXY_PREFIX,
  EMBED_USER_AGENT,
  isEmbedAssetPath,
  isExternalEmbedHost,
  partnerReferer,
} from "@/lib/embed-ext";

/**
 * Proxy document pour les embeds externes du fournisseur (uqload, voe,
 * fsvid, filemoon…).
 *
 * Ces iframes refusent le hotlink : chargées directement depuis notre page,
 * elles répondent 403 (fsvid/voe) ou « fichier verrouillé » (uqload) car le
 * référent est notre domaine. Ce proxy rejoue la requête avec le référent du
 * fournisseur, réécrit les URLs relatives en absolues, et injecte un
 * bootstrap qui redirige les appels runtime de l'hébergeur vers
 * `/api/embed/ext/proxy` — le document tournant désormais sur notre origine.
 *
 * L'hôte et le chemin de l'embed sont mémorisés côté serveur (`EMBED_HOSTS`),
 * car seul un chemin peut transiter par un remplacement d'attribut `src`.
 */

const UA = EMBED_USER_AGENT;

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("u");
  if (!raw) {
    return new Response("Paramètre manquant : u", { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response("URL invalide", { status: 400 });
  }
  if (!/^https?:$/.test(target.protocol) || !isExternalEmbedHost(target.href)) {
    return new Response("Domaine non autorisé", { status: 403 });
  }

  const fetched = await fetchExternalDocumentSafe(target.href, UA);
  if (!fetched) {
    return unavailablePage(
      "L'hébergeur ne répond pas. Choisissez une autre source dans le menu.",
    );
  }

  const embedHost = fetched.host;
  const documentPath = fetched.path;
  const bridge = (path: string): string =>
    `${EXT_BRIDGE_PATH}?h=${encodeURIComponent(embedHost)}&p=${encodeURIComponent(path)}&r=${encodeURIComponent(documentPath)}`;

  const html = rewriteHtml(fetched.html, bridge);
  const bootstrap = buildBootstrap(embedHost, documentPath);
  const body = /<head[^>]*>/i.test(html)
    ? html.replace(/<head[^>]*>/i, (m) => `${m}${bootstrap}`)
    : bootstrap + html;

  return new Response(body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Embed-Host": embedHost,
      "Referrer-Policy": "no-referrer",
    },
  });
}

/** Récupère le document d'embed (texte HTML) avec le bon référent. */
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
    if (html.length < 100) return null;
    const u = new URL(finalUrl);
    return { html, host: u.hostname, path: u.pathname + u.search };
  } catch {
    return null;
  }
}

/**
 * Réécrit les URLs relatives du HTML :
 *  - les ressources « same-origin » de l'hébergeur (ex. `/assets/x.js`,
 *    `/api/…`) deviennent des URL bridge vers `/api/embed/ext/proxy`, qui
 *    les rejoue vers l'hôte ;
 *  - les URLs absolues vers l'hébergeur passent aussi par le bridge ;
 *  - les autres URLs restent inchangées.
 */
function rewriteHtml(html: string, bridge: (path: string) => string): string {
  const rewriteValue = (value: string): string | null => {
    if (!value || /^(data:|blob:|about:|javascript:|mailto:|tel:|#)/i.test(value)) return null;
    if (value.startsWith("//")) return null;
    let abs: URL;
    try {
      abs = new URL(value, "https://x");
    } catch {
      return null;
    }
    // Chemin racine relatif (same-origin de l'hébergeur) : seules les
    // ressources/API connues sont réécrites ; le reste est laissé tel quel.
    if (abs.origin === "https://x") {
      return isEmbedAssetPath(abs.pathname) ? bridge(abs.pathname + abs.search) : null;
    }
    return null;
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

/** Injecte le stockage mémoire + le bootstrap de réécriture runtime. */
function buildBootstrap(embedHost: string, documentPath: string): string {
  return `${STORAGE_SHIM}<script>(function(){
var HOST=${JSON.stringify(embedHost)};
var PATH=${JSON.stringify(documentPath)};
var BH="https://"+HOST;
var PROXY=${JSON.stringify(EXT_PROXY_PREFIX)};
var BRIDGE=${JSON.stringify(EXT_BRIDGE_PATH)};
function bridge(p,q){
  var r=BRIDGE+"?h="+encodeURIComponent(HOST)+"&p="+encodeURIComponent(p)+(q?"&q="+encodeURIComponent(q):"")+"&r="+encodeURIComponent(PATH);
  return r;
}
function map(u){
  if(typeof u!=="string"||!u)return null;
  if(u.charAt(0)==="/"&&u.charAt(1)==="/")return null;
  var a;try{a=new URL(u,BH+PATH);}catch(e){return null;}
  if(a.protocol!=="http:"&&a.protocol!=="https:")return null;
  if(a.origin===location.origin){
    if(a.pathname.indexOf("/api/embed/ext/proxy")===0)return a.pathname+a.search;
    return bridge(a.pathname,a.search.slice(1));
  }
  if(a.hostname!==HOST)return null;
  return bridge(a.pathname,a.search.slice(1));
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
  }catch(e){}
  return of_.apply(this,arguments);
};
var XP=XMLHttpRequest.prototype,oo=XP.open;
XP.open=function(){
  var args=Array.prototype.slice.call(arguments);
  try{
    if(typeof args[1]==="string"){var m=map(args[1]);if(m)args[1]=m;}
  }catch(e){}
  return oo.apply(this,args);
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
  function mk(){var d={};return{_d:d,getItem:function(k){return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null;},setItem:function(k,v){d[k]=String(v);},removeItem:function(k){delete d[k];},clear:function(){for(var k in d)delete d[k];},key:function(i){return Object.keys(d)[i]||null;},get length(){return Object.keys(d).length;}};}
  Object.defineProperty(window,"localStorage",{value:mk(),configurable:true,writable:true});
  Object.defineProperty(window,"sessionStorage",{value:mk(),configurable:true,writable:true});
}catch(e){}
try{
  var jar="";
  Object.defineProperty(document,"cookie",{configurable:true,get:function(){return jar;},set:function(v){var p=String(v).split(";")[0];if(p&&p.indexOf("=")>0){jar=jar?jar+"; "+p:p;}}});
}catch(e){}
})();</script>`;

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

