/**
 * Script injecté dans les documents d'embed (Vidzy, uqload, fsvid, …).
 *
 * Il sert de pont entre la page hôte (`EmbedFrame`) et le lecteur :
 *  - remonte `timeupdate` / `play` / `pause` / `ended` pour la sauvegarde de
 *    progression et la détection de blocage (une pause manuelle n'est pas un
 *    blocage) ;
 *  - reçoit `seek` / `play` du parent. Les demandes `seek` sont mises en
 *    attente tant que le `<video>` n'a pas ses métadonnées, puis appliquées
 *    automatiquement (`loadedmetadata`/`durationchange`).
 */
export const PLAYER_BRIDGE_SCRIPT = `<script>(function(){
var pending=null,lastPost=0;
function video(){return document.querySelector("video");}
function post(m){try{if(window.parent&&window.parent!==window)window.parent.postMessage(m,"*");}catch(e){}}
function ready(v){return !!v&&isFinite(v.duration)&&v.duration>0;}
function applyPending(){
  var v=video();
  if(!v||pending===null||!ready(v))return false;
  try{v.currentTime=pending;}catch(e){return false;}
  pending=null;return true;
}
function player(){
  try{
    var ps=window.videojs&&window.videojs.getPlayers?window.videojs.getPlayers():null;
    var k=ps?Object.keys(ps)[0]:null;
    return k&&ps[k]?ps[k]:null;
  }catch(e){return null;}
}
document.addEventListener("loadedmetadata",function(e){
  if(e.target&&e.target.tagName==="VIDEO")applyPending();
},true);
document.addEventListener("durationchange",function(e){
  if(e.target&&e.target.tagName==="VIDEO")applyPending();
},true);
document.addEventListener("timeupdate",function(e){
  var v=e.target;
  if(!v||v.tagName!=="VIDEO")return;
  var now=Date.now();
  if(now-lastPost<1500)return;
  lastPost=now;
  post({action:"timeupdate",currentTime:v.currentTime,duration:isFinite(v.duration)?v.duration:0,paused:v.paused,ended:v.ended});
},true);
document.addEventListener("play",function(e){
  var v=e.target;
  if(!v||v.tagName!=="VIDEO")return;
  lastPost=Date.now();
  post({action:"play",currentTime:v.currentTime,duration:isFinite(v.duration)?v.duration:0});
},true);
document.addEventListener("pause",function(e){
  var v=e.target;
  if(!v||v.tagName!=="VIDEO"||v.ended)return;
  post({action:"pause",currentTime:v.currentTime,duration:isFinite(v.duration)?v.duration:0});
},true);
document.addEventListener("ended",function(e){
  var v=e.target;
  if(!v||v.tagName!=="VIDEO")return;
  post({action:"videoEnded",currentTime:v.currentTime,duration:isFinite(v.duration)?v.duration:0});
},true);
window.addEventListener("message",function(ev){
  var d=ev.data;
  if(!d||typeof d!=="object")return;
  if(d.action==="seek"&&typeof d.value==="number"&&isFinite(d.value)){
    var v=video();
    if(v&&ready(v)){try{v.currentTime=d.value;pending=null;}catch(e){pending=d.value;}}
    else pending=d.value;
  }else if(d.action==="play"){
    var pl=player();
    try{
      if(pl&&pl.paused())pl.play();
      else{
        var v2=video();
        if(v2)v2.play();
      }
    }catch(e){}
  }
});
if(document.documentElement){
  new MutationObserver(function(){
    if(pending!==null)applyPending();
  }).observe(document.documentElement,{childList:true,subtree:true});
}
})();</script>`;
