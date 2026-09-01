/* Offline support. Registered only over http, so opening the file straight
   from disk still works and simply has no service worker. */
(function(){
"use strict";
if (!("serviceWorker" in navigator)) return;
if (location.protocol !== "http:" && location.protocol !== "https:") return;
window.addEventListener("load", function(){
  navigator.serviceWorker.register("sw.js").catch(function(){ /* offline support is optional */ });
});
})();
