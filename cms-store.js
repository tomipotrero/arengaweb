/* cms-store.js — capa de persistencia del CMS de Arenga.
 *
 *   UI del panel  →  servicio (window.ArengaCms)  →  adaptador  →  transporte
 *
 * Nada por encima del adaptador sabe de GitHub, shas, base64 ni commits.
 * Hoy el adaptador canónico es GitHub (repo del proyecto). Para producción en
 * Cloudflare se cambia UNA línea (ArengaPersistence.http({base:"/api"})) y el
 * panel no se toca: el contrato del adaptador es el mismo.
 *
 * Contrato del adaptador (todo async):
 *   describe()                        -> { label, canWrite }
 *   readContent()                     -> { text, version }
 *   writeContent(text, expected)      -> { version }
 *   readAsset(path)                   -> { base64, mime }
 *   writeAsset(path, base64)          -> { version }
 *   removeAsset(path)                 -> true
 *   listing()                         -> Map(path -> { sha, size })
 */
(function () {
  "use strict";

  /* ---------------------------------------------------------------- utils */

  function bytesToB64(bytes) {
    var s = "", CH = 0x8000;
    for (var i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(s);
  }
  function b64ToBytes(b64) {
    var bin = atob(String(b64).replace(/\s+/g, ""));
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function textToB64(str) { return bytesToB64(new TextEncoder().encode(str)); }
  function b64ToText(b64) { return new TextDecoder().decode(b64ToBytes(b64)); }

  async function hashHex(algo, bytes) {
    var buf = await crypto.subtle.digest(algo, bytes);
    return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }
  // sha1 del blob de git: así se compara un archivo local con el del repo sin bajarlo
  async function gitBlobSha(bytes) {
    var head = new TextEncoder().encode("blob " + bytes.length + "\0");
    var all = new Uint8Array(head.length + bytes.length);
    all.set(head, 0); all.set(bytes, head.length);
    return hashHex("SHA-1", all);
  }
  async function contentHash(bytes) { return (await hashHex("SHA-256", bytes)).slice(0, 10); }

  var MIME = { webp: "image/webp", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", avif: "image/avif", svg: "image/svg+xml", json: "application/json", js: "text/javascript", html: "text/html", txt: "text/plain", ico: "image/x-icon" };
  function mimeOf(path) { return MIME[String(path).split(".").pop().toLowerCase()] || "application/octet-stream"; }

  function slugify(s) {
    return String(s || "").toLowerCase().replace(/\.[a-z0-9]+$/, "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "imagen";
  }

  // publicaciones viejas guardaron entidades HTML ("&amp;"): se decodifican al leer
  function decodeEntities(o) {
    if (typeof o === "string") return o.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    if (Array.isArray(o)) return o.map(decodeEntities);
    if (o && typeof o === "object") { var out = {}; Object.keys(o).forEach(function (k) { out[k] = decodeEntities(o[k]); }); return out; }
    return o;
  }

  // toda ruta de asset del CMS: carpeta conocida + nombre de archivo
  var ASSET_RE = /^(media|work|team|logos)\/[A-Za-z0-9._-]+$/;
  var CMS_DIR = "media/";               // subidas del panel: sólo acá se borra automáticamente
  function isAssetPath(v) { return typeof v === "string" && ASSET_RE.test(v); }

  function assetRefs(data) {
    var found = Object.create(null);
    (function walk(o) {
      if (typeof o === "string") { if (isAssetPath(o)) found[o] = true; return; }
      if (Array.isArray(o)) { o.forEach(walk); return; }
      if (o && typeof o === "object") Object.keys(o).forEach(function (k) { walk(o[k]); });
    })(data);
    return Object.keys(found).sort();
  }

  // merge que nunca angosta el esquema: lo que el editor no conoce se conserva
  function mergeDeep(base, over) {
    if (!base || typeof base !== "object" || Array.isArray(base)) return over === undefined ? base : over;
    if (!over || typeof over !== "object" || Array.isArray(over)) return over === undefined ? base : over;
    var out = Object.assign({}, base);
    Object.keys(over).forEach(function (k) { out[k] = (k in base) ? mergeDeep(base[k], over[k]) : over[k]; });
    return out;
  }

  function normalize(data) {
    var d = decodeEntities(data && typeof data === "object" ? data : {});
    ["cases", "leaders", "team", "caps", "steps", "clients", "selected", "stats", "brands"].forEach(function (k) {
      if (!Array.isArray(d[k])) d[k] = Array.isArray(d[k]) ? d[k] : (d[k] == null ? [] : d[k]);
    });
    if (Array.isArray(d.cases)) d.cases.forEach(function (c) {
      if (!c || typeof c !== "object") return;
      if (!Array.isArray(c.stills)) c.stills = ["", "", "", ""];
      while (c.stills.length < 4) c.stills.push("");
    });
    d.runtime = Object.assign({ repo: "", branch: "main", contentPath: "content.json", assetDir: CMS_DIR, canonicalOrigin: "" }, d.runtime || {});
    return d;
  }

  function serialize(data) { return JSON.stringify(data, null, 2) + "\n"; }

  /* ----------------------------------------------------------- adaptadores */

  // Adaptador canónico de desarrollo: el repositorio de GitHub.
  function githubAdapter(cfg) {
    var repo = String(cfg.repo || "").trim();
    var branch = String(cfg.branch || "main").trim();
    var contentPath = String(cfg.contentPath || "content.json").trim();
    var token = String(cfg.token || "").trim();
    var API = "https://api.github.com/repos/" + repo;
    var queue = Promise.resolve();

    function headers(accept) {
      var h = { Accept: accept || "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
      if (token) h.Authorization = "Bearer " + token;
      return h;
    }
    function url(path) { return API + "/contents/" + String(path).split("/").map(encodeURIComponent).join("/"); }

    async function readMeta(path) {
      var r = await fetch(url(path) + "?ref=" + encodeURIComponent(branch) + "&t=" + Date.now(), { headers: headers(), cache: "no-store" });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error("GitHub " + r.status + " leyendo " + path);
      return r.json();
    }

    // las escrituras van de a una: dos PUT solapados llevan el mismo sha y el segundo choca (409)
    function serial(fn) {
      queue = queue.then(fn, fn);
      return queue;
    }

    async function put(path, base64, message, expected) {
      var res, sha = expected;
      for (var attempt = 0; attempt < 3; attempt++) {
        if (sha === undefined) { var meta = await readMeta(path); sha = meta ? meta.sha : undefined; }
        res = await fetch(url(path), {
          method: "PUT",
          headers: Object.assign({ "Content-Type": "application/json" }, headers()),
          body: JSON.stringify({ message: message, content: base64, branch: branch, sha: sha })
        });
        if (res.ok) { var j = await res.json(); return { version: j.content && j.content.sha, commit: j.commit && j.commit.sha }; }
        if (res.status !== 409 && res.status !== 422) break;
        sha = undefined;
        await new Promise(function (r) { setTimeout(r, 500 + attempt * 700); });
      }
      throw new Error("GitHub " + res.status + " escribiendo " + path + ": " + (await res.text()).slice(0, 160));
    }

    return {
      describe: function () { return { label: "GitHub " + repo + "@" + branch, canWrite: !!(repo && token), repo: repo, branch: branch }; },

      readContent: async function () {
        var meta = await readMeta(contentPath);
        if (!meta) return { text: null, version: null };
        return { text: b64ToText(meta.content || ""), version: meta.sha };
      },
      writeContent: function (text, expected) {
        return serial(function () { return put(contentPath, textToB64(text), "Contenido actualizado desde el panel", expected); });
      },

      readAsset: async function (path) {
        var meta = await readMeta(path);
        if (!meta) return null;
        if (meta.content) return { base64: String(meta.content).replace(/\s+/g, ""), mime: mimeOf(path) };
        // >1 MB: la API de contents no manda bytes, hay que ir al blob
        var r = await fetch(API + "/git/blobs/" + meta.sha, { headers: headers(), cache: "no-store" });
        if (!r.ok) throw new Error("GitHub " + r.status + " leyendo blob de " + path);
        var j = await r.json();
        return { base64: String(j.content || "").replace(/\s+/g, ""), mime: mimeOf(path) };
      },
      writeAsset: function (path, base64) {
        return serial(function () { return put(path, base64, "Asset " + path + " desde el panel"); });
      },
      removeAsset: function (path) {
        return serial(async function () {
          var meta = await readMeta(path);
          if (!meta) return true;
          var r = await fetch(url(path), {
            method: "DELETE",
            headers: Object.assign({ "Content-Type": "application/json" }, headers()),
            body: JSON.stringify({ message: "Baja de " + path + " (sin uso en el CMS)", sha: meta.sha, branch: branch })
          });
          if (!r.ok) throw new Error("GitHub " + r.status + " borrando " + path);
          return true;
        });
      },

      listing: async function () {
        var r = await fetch(API + "/git/trees/" + encodeURIComponent(branch) + "?recursive=1&t=" + Date.now(), { headers: headers(), cache: "no-store" });
        if (!r.ok) throw new Error("GitHub " + r.status + " leyendo el árbol");
        var j = await r.json(), map = new Map();
        (j.tree || []).forEach(function (n) { if (n.type === "blob") map.set(n.path, { sha: n.sha, size: n.size }); });
        return map;
      }
    };
  }

  // Adaptador para producción (Cloudflare Workers + D1/R2). Mismo contrato,
  // otro transporte: el panel no cambia cuando se migre.
  function httpAdapter(cfg) {
    var base = String(cfg.base || "/api").replace(/\/$/, "");
    var contentPath = String(cfg.contentPath || "content.json");
    function jfetch(path, init) {
      return fetch(base + path, Object.assign({ cache: "no-store", headers: Object.assign({ "Content-Type": "application/json" }, cfg.headers || {}) }, init))
        .then(function (r) { if (!r.ok) throw new Error("API " + r.status + " en " + path); return r; });
    }
    return {
      describe: function () { return { label: "API " + base, canWrite: true }; },
      readContent: function () { return jfetch("/content").then(function (r) { return r.json(); }).then(function (j) { return { text: typeof j.text === "string" ? j.text : serialize(j.data || j), version: j.version || null }; }); },
      writeContent: function (text, expected) { return jfetch("/content", { method: "PUT", body: JSON.stringify({ text: text, expected: expected }) }).then(function (r) { return r.json(); }); },
      readAsset: function (path) { return jfetch("/assets/" + encodeURIComponent(path)).then(function (r) { return r.json(); }); },
      writeAsset: function (path, base64) { return jfetch("/assets", { method: "POST", body: JSON.stringify({ path: path, base64: base64 }) }).then(function (r) { return r.json(); }); },
      removeAsset: function (path) { return jfetch("/assets/" + encodeURIComponent(path), { method: "DELETE" }).then(function () { return true; }); },
      listing: function () { return jfetch("/assets").then(function (r) { return r.json(); }).then(function (j) { var m = new Map(); (j.files || []).forEach(function (f) { m.set(f.path, { sha: f.sha, size: f.size }); }); return m; }); },
      contentPath: contentPath
    };
  }

  /* --------------------------------------------------------------- mirror */

  // Copia servida junto al sitio (mismo origen). Es lo que renderiza el sitio:
  // caché de trabajo, nunca la fuente. Sólo lectura desde el navegador.
  var mirror = {
    readContent: function () {
      return fetch("content.json", { cache: "no-store" })
        .then(function (r) { return r.ok ? r.text() : null; })
        .catch(function () { return null; });
    },
    readBytes: function (path) {
      return fetch(path, { cache: "no-store" })
        .then(function (r) { return r.ok ? r.arrayBuffer() : null; })
        .then(function (b) { return b ? new Uint8Array(b) : null; })
        .catch(function () { return null; });
    },
    has: function (path) {
      // algunos servidores de desarrollo no contestan HEAD: si no, se prueba con GET
      return fetch(path, { method: "HEAD", cache: "no-store" })
        .then(function (r) {
          if (r.ok) return true;
          if (r.status === 404) return false;
          return fetch(path, { cache: "no-store" }).then(function (g) { return g.ok; }).catch(function () { return false; });
        })
        .catch(function () {
          return fetch(path, { cache: "no-store" }).then(function (g) { return g.ok; }).catch(function () { return false; });
        });
    }
  };

  /* -------------------------------------------------------------- servicio */

  function createService(adapter) {
    var svc = {
      adapter: adapter,
      describe: function () { return adapter.describe(); },

      /* --- lecturas --- */
      readCanonical: async function () {
        var r = await adapter.readContent();
        return { text: r.text, version: r.version, data: r.text ? normalize(JSON.parse(r.text)) : null };
      },
      readMirror: async function () {
        var text = await mirror.readContent();
        var data = null;
        try { data = text ? normalize(JSON.parse(text)) : null; } catch (e) {}
        return { text: text, data: data };
      },

      assetRefs: assetRefs,
      normalize: normalize,
      serialize: serialize,
      mergeDeep: mergeDeep,
      cmsDir: CMS_DIR,

      /* --- subida de imagen: nombre por hash de contenido --- */
      // mismo archivo -> mismo nombre (no duplica); archivo distinto -> nombre
      // distinto (ningún caché puede servir la versión vieja de esa ruta)
      encodeImage: async function (file, maxSide) {
        var url = URL.createObjectURL(file);
        try {
          var img = await new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = url; });
          var iw = img.naturalWidth || 1600, ih = img.naturalHeight || 1600;
          var W = Math.min(maxSide || 1600, iw);
          var c = document.createElement("canvas");
          c.width = W; c.height = Math.round(ih * W / iw);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          var blob = await new Promise(function (res) { c.toBlob(res, "image/webp", 0.85); });
          return new Uint8Array(await blob.arrayBuffer());
        } finally { URL.revokeObjectURL(url); }
      },

      uploadAsset: async function (file, opts) {
        opts = opts || {};
        var bytes = await svc.encodeImage(file, opts.maxSide);
        var path = CMS_DIR + slugify(opts.name || file.name) + "-" + (await contentHash(bytes)) + ".webp";
        var tree = null;
        try { tree = await adapter.listing(); } catch (e) {}
        if (!(tree && tree.has(path))) await adapter.writeAsset(path, bytesToB64(bytes));
        var check = await adapter.readAsset(path);
        if (!check) throw new Error("La imagen no quedó guardada en el origen canónico");
        return { path: path, bytes: bytes.length, dataUrl: "data:image/webp;base64," + bytesToB64(bytes) };
      },

      /* --- auditoría: ¿el origen canónico puede reproducir el sitio? --- */
      audit: async function (data) {
        var refs = assetRefs(data);
        var tree = await adapter.listing();
        var missingRemote = refs.filter(function (p) { return !tree.has(p); });
        var localChecks = await Promise.all(refs.map(function (p) { return mirror.has(p); }));
        var missingLocal = refs.filter(function (p, i) { return !localChecks[i]; });
        var used = Object.create(null);
        refs.forEach(function (p) { used[p] = true; });
        var orphans = [];
        tree.forEach(function (_, p) { if (p.indexOf(CMS_DIR) === 0 && !used[p]) orphans.push(p); });
        return { refs: refs, missingRemote: missingRemote, missingLocal: missingLocal, orphans: orphans.sort(), tree: tree };
      },

      /* --- publicar contenido: una sola transacción --- */
      // datos + assets nuevos + baja de los que quedaron sin uso, y recién
      // entonces se considera publicado (con relectura y comparación byte a byte)
      publishContent: async function (data, opts) {
        opts = opts || {};
        var report = { uploaded: [], deleted: [], missing: [], version: null, orphansKept: [] };

        var canon = await svc.readCanonical();
        var prevRefs = canon.data ? assetRefs(canon.data) : [];
        var merged = canon.data ? mergeDeep(canon.data, normalize(data)) : normalize(data);
        var text = serialize(merged);

        // 1. assets que el CMS referencia y el origen canónico no tiene todavía:
        //    si están en la copia local, se suben (el repo no puede quedar corto)
        var tree = await adapter.listing();
        var refs = assetRefs(merged);
        for (var i = 0; i < refs.length; i++) {
          var p = refs[i];
          if (tree.has(p)) continue;
          var bytes = await mirror.readBytes(p);
          if (bytes) { await adapter.writeAsset(p, bytesToB64(bytes)); report.uploaded.push(p); }
          else report.missing.push(p);
        }
        if (report.missing.length && !opts.allowMissing) {
          throw new Error("No se publicó: faltan " + report.missing.length + " imágenes (" + report.missing.slice(0, 3).join(", ") + "). Volvé a subirlas desde el panel.");
        }

        // 2. datos, con control de versión optimista
        var res = await adapter.writeContent(text, opts.expected !== undefined ? opts.expected : canon.version);
        report.version = res.version;

        // 3. verificación: se relee del origen canónico y se compara
        var back = await adapter.readContent();
        if (back.text !== text) throw new Error("La verificación falló: el origen canónico no devolvió lo publicado. Tocá Publicar de nuevo.");
        report.version = back.version;

        // 4. limpieza: sólo assets del CMS (media/) que ya no referencia nadie
        var stillUsed = Object.create(null);
        refs.forEach(function (p) { stillUsed[p] = true; });
        var candidates = prevRefs.filter(function (p) { return p.indexOf(CMS_DIR) === 0 && !stillUsed[p]; });
        tree.forEach(function (_, p) { if (p.indexOf(CMS_DIR) === 0 && !stillUsed[p] && candidates.indexOf(p) < 0) candidates.push(p); });
        for (var j = 0; j < candidates.length; j++) {
          try { await adapter.removeAsset(candidates[j]); report.deleted.push(candidates[j]); }
          catch (e) { report.orphansKept.push(candidates[j]); }
        }

        // 5. control final: cada imagen referenciada existe en el origen canónico
        var finalTree = await adapter.listing();
        var broken = refs.filter(function (p) { return !finalTree.has(p); });
        if (broken.length) throw new Error("Publicado con faltantes: " + broken.join(", "));
        report.data = merged;
        report.text = text;
        return report;
      },

      /* --- publicar el sitio: los archivos que hacen falta para servirlo --- */
      // sube sólo lo que cambió (compara el sha1 de git sin bajar nada)
      publishSite: async function (paths, onStep) {
        var tree = await adapter.listing();
        var out = { uploaded: [], same: [], failed: [] };
        for (var i = 0; i < paths.length; i++) {
          var p = paths[i];
          if (onStep) onStep(p, i, paths.length);
          var bytes = await mirror.readBytes(p);
          if (!bytes) { out.failed.push(p + " (no está en el proyecto)"); continue; }
          var sha = await gitBlobSha(bytes);
          var remote = tree.get(p);
          if (remote && remote.sha === sha) { out.same.push(p); continue; }
          try { await adapter.writeAsset(p, bytesToB64(bytes)); out.uploaded.push(p); }
          catch (e) { out.failed.push(p + " (" + (e.message || e) + ")"); }
        }
        return out;
      },

      /* --- lo que el sitio usa para saber de dónde salió lo que muestra --- */
      compare: async function () {
        var m = await svc.readMirror();
        var c = await svc.readCanonical();
        return { inSync: !!m.text && !!c.text && m.text === c.text, mirror: m, canonical: c };
      },

      readAssetDataUrl: async function (path) {
        var a = await adapter.readAsset(path);
        return a ? "data:" + (a.mime || mimeOf(path)) + ";base64," + a.base64 : null;
      }
    };
    return svc;
  }

  /* ----------------------------------------------------------------- API */

  window.ArengaPersistence = {
    github: githubAdapter,
    http: httpAdapter,                    // producción Cloudflare: mismo contrato
    mirror: mirror,
    fromConfig: function (cfg) {
      cfg = cfg || {};
      return cfg.mode === "http" ? httpAdapter(cfg) : githubAdapter(cfg);
    }
  };
  window.ArengaCms = {
    create: function (cfg) { return createService(window.ArengaPersistence.fromConfig(cfg)); },
    fromAdapter: createService,
    helpers: { assetRefs: assetRefs, normalize: normalize, serialize: serialize, mergeDeep: mergeDeep, decodeEntities: decodeEntities, slugify: slugify, bytesToB64: bytesToB64, b64ToBytes: b64ToBytes, contentHash: contentHash, gitBlobSha: gitBlobSha, cmsDir: CMS_DIR, isAssetPath: isAssetPath }
  };
})();
