/* global ServiceWorkerGlobalScope localforage */
let bangs = null;
const normalizeBang = (bang) => bang.toLowerCase().normalize();
const bangsLoaded = fetch("/bangify/bangs.json").then(async (e) => {
  bangs = await e.json();
  for (let bang of bangs) bang.t = normalizeBang(bang.t);
});
if (
  typeof ServiceWorkerGlobalScope !== "undefined" &&
  self instanceof ServiceWorkerGlobalScope
) {
  importScripts(
    "https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js"
  );
  self.addEventListener("install", (event) => {
    self.skipWaiting();
  });
  self.addEventListener("fetch", (event) => {
    const u = new URL(event.request.url);
    if (u.hostname == location.hostname && u.pathname.startsWith("/bangify/go")) {
      let q = u.searchParams.get("q");
      event.respondWith(handle(q));
    } else return event.respondWith(fetch(event.request));
  });
} else {
  bangsLoaded.then(async () => {
    const response = await handle(
      new URLSearchParams(location.search).get("q")
    );
    if ((response.status = 302)) {
      location.replace(response.headers.get("location"));
    } else {
      document.body.textContent = await response.text();
    }
  });
}
async function handle(query) {
  await bangsLoaded;
  const seggs = query.split(/\s+/);
  let foundBang = false;
  const bangless = seggs
    .filter((e) => {
      if (e[0] !== "!" || foundBang || e.length < 2) return true;
      foundBang = true;
      return false;
    })
    .join(" ")
    .trim();
  let bang = seggs.find((e) => e[0] === "!" && e.length > 1);
  if (!bang) {
    bang = "!" + ((await localforage.getItem("default")) || "ddg");
  }
  bang = normalizeBang(bang.slice(1));
  const engine = bangs.find((e) => e.t === bang);
  if (!engine) {
    return new Response("idk what !" + bang + " is, sorry :(", {
      headers: { "content-type": "text/plain" },
    });
  }
  return new Response("", {
    status: 302,
    headers: {
      location: bangless
        ? engine.u.replace(/{{{s}}}/g, encodeURIComponent(bangless))
        : "https://" + engine.d,
    },
  });
}
