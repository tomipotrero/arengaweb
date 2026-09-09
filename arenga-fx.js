/* Arenga — shared runtime: cursor, page curtain, mobile menu and the motion engine every page mounts. */
(function () {
  "use strict";
  if (window.ArengaEngine) return;
  /* Las imágenes las manda el CMS (content.json). Con esta bandera <image-slot>
     no lee ni escribe su sidecar: sin segunda copia de imágenes fuera del CMS. */
  window.ARENGA_CMS_IMAGES = true;
  var FINE = window.matchMedia ? window.matchMedia("(pointer: fine)") : { matches: true };
  var EZ = "cubic-bezier(.2,.7,.2,1)";

  /* rules inline styles cannot express: child-on-parent hover, pointer media */
  var css = document.createElement("style");
  css.textContent =
    "[data-ul]:hover [data-ul-line]{transform:scaleX(1)!important}" +
    "[data-stack-link]:hover [data-stack-cta]{color:#ff5715;transform:translateY(-1px)}" +
    "@media (pointer:fine){*,*::before,*::after{cursor:none!important}}";
  document.head.appendChild(css);

  /* ---- cursor: a fixed-size dot in difference blend, always visible on fine pointers.
     It shrinks a touch while the button is held. ---- */
  var cur = null, cx = -100, cy = -100, tx = -100, ty = -100, vis = false, sc = 1, tsc = 1;
  function onCurMove(e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    tx = e.clientX; ty = e.clientY;
    if (!vis) { vis = true; cur.style.opacity = "1"; }
  }
  function curFrame() {
    requestAnimationFrame(curFrame);
    if (Math.abs(tx - cx) < 0.05 && Math.abs(ty - cy) < 0.05 && Math.abs(tsc - sc) < 0.002) return;
    cx += (tx - cx) * 0.38; cy += (ty - cy) * 0.38; sc += (tsc - sc) * 0.28;
    cur.style.transform = "translate3d(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px,0) scale(" + sc.toFixed(3) + ")";
  }
  if (FINE.matches) {
    cur = document.createElement("div");
    cur.setAttribute("data-arenga-cursor", "1");
    cur.style.cssText = "position:fixed;left:0;top:0;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:999px;background:#fff;mix-blend-mode:difference;pointer-events:none;z-index:100;opacity:0;transform:translate3d(-100px,-100px,0);will-change:transform;transition:opacity 220ms ease;";
    document.body.appendChild(cur);
    document.addEventListener("pointermove", onCurMove, { passive: true });
    document.addEventListener("pointerdown", function (e) { if (!e.pointerType || e.pointerType === "mouse") tsc = 0.65; }, { passive: true });
    document.addEventListener("pointerup", function () { tsc = 1; }, { passive: true });
    document.addEventListener("pointercancel", function () { tsc = 1; }, { passive: true });
    document.documentElement.addEventListener("mouseleave", function () { vis = false; cur.style.opacity = "0"; tsc = 1; });
    requestAnimationFrame(curFrame);
  }

  /* ---- page transition: the frosted curtain rises with a small loader on it; the next page finishes the wipe upward ---- */
  var KEY = "arenga-wipe", arrived = false, leaving = false;
  try { arrived = sessionStorage.getItem(KEY) === "1"; if (arrived) sessionStorage.removeItem(KEY); } catch (e) {}
  window.__arengaArrived = arrived;
  var curtain = document.createElement("div");
  curtain.setAttribute("data-arenga-curtain", "1");
  curtain.style.cssText = "position:fixed;left:0;top:0;width:100%;height:100%;z-index:90;pointer-events:none;background:linear-gradient(170deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02) 44%,rgba(6,8,9,0.55)),rgba(5,7,8,0.45);backdrop-filter:blur(26px) saturate(140%);-webkit-backdrop-filter:blur(26px) saturate(140%);box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.5),0 -40px 90px rgba(0,0,0,0.55);will-change:transform;transform:translate3d(0," + (arrived ? "0" : "102%") + ",0);";
  var inner = document.createElement("div");
  inner.style.cssText = "position:absolute;inset:0;color:#f4f2ee;font-family:'Hubot Sans','Archivo',Helvetica,sans-serif;will-change:transform,opacity;";
  inner.innerHTML = '<div style="position:absolute;left:clamp(30px,5.2vw,104px);top:28px;display:flex;align-items:center;gap:14px"><svg viewBox="0 0 52.5 31.1" style="height:20px;width:auto" aria-hidden="true"><path fill="currentColor" d="M45.5435 7.84641L45.4397 8.03612C43.7536 11.1461 40.4758 13.0867 36.9054 13.0867H32.5423L34.263 17.8138H40.114L36.4336 24.6059C35.9523 25.4954 35.0149 26.049 33.9956 26.049H32.9513L31.7968 22.6L30.8436 19.7575L30.1925 17.8138H30.1296L23.9262 0H12.932L10.1103 4.95415L5.41691 13.1862L2.72104 17.9133L0.0629141 22.5783L0 23.1567H6.44241L6.50532 23.0447C8.2386 19.885 11.5825 17.9164 15.2189 17.9164H19.582L17.8613 13.1893H11.938L13.0075 11.2456L16.4678 4.95415H17.5121C18.503 4.95415 19.3838 5.57614 19.7047 6.50291L21.9916 13.0898L23.6714 17.8169L26.5938 26.049L28.3522 31.0031H39.3465L52.4106 8.42486L52.4735 7.84641H45.5435Z"></path></svg>' +
    '<span style="font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:rgba(244,242,238,0.55)">Cargando</span></div>' +
    '<div style="position:absolute;right:clamp(30px,5.2vw,104px);bottom:88px;display:flex;align-items:baseline;gap:3px;line-height:0.8;font-family:\'Archivo\',Helvetica,sans-serif"><span data-curtain-num style="font-size:clamp(34px,3.4vw,48px);font-weight:400;letter-spacing:-0.04em;font-variant-numeric:tabular-nums">0</span><span style="font-size:14px">%</span></div>';
  var line = document.createElement("div");
  line.style.cssText = "position:absolute;left:clamp(30px,5.2vw,104px);right:clamp(30px,5.2vw,104px);bottom:40px;height:1px;background:rgba(244,242,238,0.16);";
  var fill = document.createElement("div");
  fill.style.cssText = "position:absolute;inset:0;background:#f4f2ee;transform-origin:0 50%;transform:scaleX(0);box-shadow:0 0 14px rgba(244,242,238,0.35);will-change:transform;";
  line.appendChild(fill);
  curtain.appendChild(line);
  curtain.appendChild(inner);
  document.body.appendChild(curtain);
  var num = curtain.querySelector("[data-curtain-num]");
  var pct = 0, pctRaf = 0, pctTarget = 0, pctLast = -1;
  function setPct(v) {
    pct = v;
    var r = Math.round(v);
    if (r !== pctLast) { pctLast = r; if (num) num.textContent = String(r); }
    fill.style.transform = "scaleX(" + (v / 100).toFixed(4) + ")";
  }
  function runPct() {
    cancelAnimationFrame(pctRaf);
    var t0 = 0;
    var step = function (t) {
      if (!t0) t0 = t;
      var d = t - t0;
      pct += (pctTarget - pct) * (1 - Math.exp(-Math.min(64, d > 40 ? 16 : d) / 130));
      t0 = t;
      setPct(pct);
      if (Math.abs(pctTarget - pct) > 0.4) pctRaf = requestAnimationFrame(step); else setPct(pctTarget);
    };
    pctRaf = requestAnimationFrame(step);
  }
  function parkCurtain() {
    cancelAnimationFrame(pctRaf);
    curtain.style.transition = "none";
    curtain.style.transform = "translate3d(0,102%,0)";
    inner.style.transition = "none"; inner.style.transform = "translate3d(0,0,0)"; inner.style.opacity = "1";
    setPct(0);
    leaving = false;
  }
  function finishArrival() {
    pctTarget = 92; runPct();
    var fonts = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    var loaded = document.readyState === "complete" ? Promise.resolve() : new Promise(function (r) { window.addEventListener("load", r, { once: true }); });
    Promise.race([Promise.all([fonts, loaded]), new Promise(function (r) { setTimeout(r, 1100); })]).then(function () {
      pctTarget = 100; runPct();
      setTimeout(function () {
        curtain.style.transition = "transform 760ms cubic-bezier(.76,0,.18,1)";
        curtain.style.transform = "translate3d(0,-102%,0)";
        inner.style.transition = "transform 760ms cubic-bezier(.76,0,.18,1), opacity 460ms ease 90ms";
        inner.style.transform = "translate3d(0,7vh,0)"; inner.style.opacity = "0";
        setTimeout(parkCurtain, 800);
      }, 240);
    });
  }
  if (arrived) { setPct(18); finishArrival(); }
  function leaveTo(href) {
    if (leaving) return;
    parkCurtain();
    leaving = true;
    pctTarget = 74; runPct();
    requestAnimationFrame(function () {
      curtain.style.transition = "transform 640ms cubic-bezier(.7,0,.16,1)";
      curtain.style.transform = "translate3d(0,0,0)";
    });
    setTimeout(function () {
      try { sessionStorage.setItem(KEY, "1"); } catch (e) {}
      location.href = href;
    }, 680);
  }
  window.addEventListener("pageshow", function (e) { if (e.persisted) parkCurtain(); });

  /* ---- video lightbox: the same clip, big, with the player's own controls ---- */
  function openVideoLightbox(kind, id, src, label, onClose) {
    if (document.querySelector("[data-video-modal]")) return;
    const wrap = document.createElement("div");
    wrap.setAttribute("data-video-modal", "1");
    wrap.style.cssText = "position:fixed;inset:0;z-index:95;display:flex;align-items:center;justify-content:center;padding:clamp(16px,4vw,64px);opacity:0;transition:opacity 320ms ease;background:linear-gradient(170deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01) 40%,rgba(255,255,255,0.03)),rgba(5,7,8,0.82);backdrop-filter:blur(22px) saturate(130%);-webkit-backdrop-filter:blur(22px) saturate(130%);";
    const stage = document.createElement("div");
    stage.style.cssText = "position:relative;width:100%;max-width:1440px;aspect-ratio:16/9;border-radius:22px;overflow:hidden;background:#0b0e13;transform:translate3d(0,18px,0) scale(0.98);transition:transform 520ms cubic-bezier(.2,.7,.2,1);box-shadow:inset 0 1.5px 0.5px rgba(255,255,255,0.4),0 0 0 1px rgba(255,255,255,0.12),0 60px 120px -40px rgba(0,0,0,0.95);";
    if (kind === "vimeo" || kind === "yt") {
      const f = document.createElement("iframe");
      f.src = kind === "vimeo"
        ? "https://player.vimeo.com/video/" + id + "?autoplay=1&title=0&byline=0&portrait=0&dnt=1&playsinline=1"
        : "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0&modestbranding=1&playsinline=1";
      f.setAttribute("allow", "autoplay; fullscreen; picture-in-picture; encrypted-media");
      f.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      f.setAttribute("allowfullscreen", "");
      f.setAttribute("title", label || "Video");
      f.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:0;";
      stage.appendChild(f);
    } else {
      const vv = document.createElement("video");
      vv.src = src; vv.controls = true; vv.autoplay = true; vv.playsInline = true;
      vv.setAttribute("aria-label", label || "Video");
      vv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#0b0e13;";
      stage.appendChild(vv);
    }
    const close = document.createElement("button");
    close.setAttribute("aria-label", "Cerrar video");
    close.setAttribute("data-hot", "1");
    close.style.cssText = "position:absolute;top:clamp(14px,2.4vw,28px);right:clamp(14px,2.4vw,28px);z-index:2;appearance:none;border:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:999px;color:#f4f2ee;background:linear-gradient(160deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03) 48%,rgba(255,255,255,0.06)),rgba(5,7,8,0.5);backdrop-filter:blur(10px) saturate(130%);-webkit-backdrop-filter:blur(10px) saturate(130%);box-shadow:inset 0 1.2px 0.5px rgba(255,255,255,0.7),inset 0 -1.2px 0.5px rgba(255,255,255,0.3),0 0 0 1px rgba(255,255,255,0.14),0 14px 30px -14px rgba(0,0,0,0.8);";
    close.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>';
    wrap.appendChild(stage);
    wrap.appendChild(close);
    document.body.appendChild(wrap);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    requestAnimationFrame(() => { wrap.style.opacity = "1"; stage.style.transform = "translate3d(0,0,0) scale(1)"; });
    const shut = () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prev;
      wrap.style.opacity = "0"; stage.style.transform = "translate3d(0,18px,0) scale(0.98)";
      setTimeout(() => wrap.remove(), 340);
      if (onClose) onClose();
    };
    const onKey = (e) => { if (e.key === "Escape") shut(); };
    window.addEventListener("keydown", onKey);
    close.addEventListener("click", shut);
    wrap.addEventListener("click", (e) => { if (e.target === wrap) shut(); });
  }

  /* ---- contenido: una sola fuente, content.json, leído en cada arranque ----
     Sin localStorage, sin sessionStorage, sin borradores, sin blobs, sin
     selecciones guardadas en el navegador: lo que se ve es lo que está
     persistido. En la vista previa (no en producción) además se compara con el
     origen canónico —el repositorio— y se resuelven desde ahí las imágenes que
     esta copia del proyecto todavía no tiene. */
  var ENGINES = [], contentP = null;
  window.ArengaSync = { source: "content.json", canonical: null, inSync: null, healed: [], note: "" };

  // publicaciones viejas guardaron entidades HTML ("&amp;"): se decodifican al leer
  function decode(o) {
    if (typeof o === "string") return o.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    if (Array.isArray(o)) return o.map(decode);
    if (o && typeof o === "object") { var out = {}; Object.keys(o).forEach(function (k) { out[k] = decode(o[k]); }); return out; }
    return o;
  }

  // vista previa = cualquier lugar que no sea el sitio publicado
  function isPreview(cfg) {
    var origin = (cfg && cfg.canonicalOrigin) || "";
    if (origin && location.origin === origin) return false;
    return !!window.omelette || location.protocol === "file:" || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || !!origin;
  }

  function loadContent() {
    if (contentP) return contentP;
    contentP = fetch("content.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(decode)
      .then(function (c) {
        var cfg = (c && c.runtime) || {};
        if (!c || !isPreview(cfg) || !window.ArengaCms || !cfg.repo) return c;
        return reconcile(c, cfg).catch(function () { return c; });
      });
    return contentP;
  }

  /* Vista previa: lo que se ve es lo PUBLICADO.
     1. se lee content.json del repositorio (una sola llamada, sin polling) y eso
        es lo que se renderiza: publicar desde el panel alcanza, no hay que
        sincronizar nada a mano ni desde otra máquina
     2. las imágenes que el contenido publicado referencia y esta copia del
        proyecto no tiene se leen del repositorio, en memoria y sólo por esta
        carga: ninguna imagen depende del navegador ni de la máquina
     Si el repositorio no contesta, sigue la copia local y el sello lo dice. */
  function reconcile(local, cfg) {
    // el token del panel (archivo del proyecto, sólo existe en la vista previa)
    // sube el límite de la API de GitHub; sin él igual funciona, más limitado
    return (window.omelette ? fetch("admin.state.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : {}; }) : Promise.resolve({}))
      .catch(function () { return {}; })
      .then(function (dev) {
        var svc = window.ArengaCms.create({ repo: cfg.repo, branch: cfg.branch || "main", contentPath: cfg.contentPath || "content.json", token: dev.token || "" });
        window.ArengaSync.canonical = cfg.repo + "@" + (cfg.branch || "main");

        // 1. el contenido publicado manda
        return svc.readCanonical().then(function (r) {
          if (!r || !r.data) { window.ArengaSync.note = "el repo no devolvió contenido"; return local; }
          var c = decode(r.data);
          window.ArengaSync.source = "repo";
          window.ArengaSync.version = r.version;
          window.ArengaSync.inSync = !!(local && JSON.stringify(c) === JSON.stringify(local));
          return c;
        }).catch(function () {
          window.ArengaSync.note = "no se pudo leer el repo — copia local";
          return local;
        }).then(function (c) {
          badge();
          // 2. imágenes que esta copia no tiene -> se leen del repositorio
          var refs = window.ArengaCms.helpers.assetRefs(c);
          return Promise.all(refs.map(function (p) {
            return window.ArengaPersistence.mirror.has(p).then(function (ok) { return ok ? null : p; });
          })).then(function (miss) {
            var missing = miss.filter(Boolean);
            if (!missing.length) { badge(); return c; }
            var map = {};
            return Promise.all(missing.slice(0, 24).map(function (p) {
              return svc.readAssetDataUrl(p).then(function (u) { if (u) map[p] = u; }).catch(function () {});
            })).then(function () {
              var healed = Object.keys(map);
              window.ArengaSync.healed = healed;
              if (!healed.length) { badge(); return c; }
              (function walk(o) {
                if (!o || typeof o !== "object") return;
                Object.keys(o).forEach(function (k) {
                  var v = o[k];
                  if (typeof v === "string") { if (map[v]) o[k] = map[v]; }
                  else walk(v);
                });
              })(c);
              badge();
              return c;
            });
          });
        });
      });
  }

  /* Sello de procedencia: en la vista previa dice de dónde salió lo que se ve.
     Nunca aparece en el sitio publicado. */
  function badge() {
    var s = window.ArengaSync, el = document.getElementById("arenga-sync-badge");
    if (!s.canonical) return;
    var bits = [];
    if (s.source === "repo") {
      bits.push("contenido publicado · " + s.canonical + (s.version ? " @ " + String(s.version).slice(0, 7) : ""));
      if (s.inSync === false) bits.push("la copia del proyecto es distinta (se ignora)");
    } else {
      bits.push("copia local del proyecto");
      if (s.note) bits.push(s.note);
    }
    if (s.healed && s.healed.length) bits.push(s.healed.length + " imágenes leídas del repo");
    var txt = bits.join("  ·  ");
    if (!el) {
      el = document.createElement("button");
      el.id = "arenga-sync-badge";
      el.type = "button";
      el.title = "Procedencia del contenido. Clic para ocultar.";
      el.style.cssText = "position:fixed;left:14px;bottom:14px;z-index:120;max-width:min(92vw,560px);padding:7px 11px;border:none;border-radius:999px;font:500 10.5px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em;text-align:left;color:rgba(244,242,238,.66);background:rgba(7,9,11,.72);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 0 0 1px rgba(255,255,255,.12);cursor:pointer";
      el.addEventListener("click", function () { el.remove(); });
      (document.body || document.documentElement).appendChild(el);
    }
    el.textContent = txt;
    el.style.color = s.source === "repo" ? "rgba(244,242,238,.66)" : "rgba(255,141,90,.92)";
  }
  function dig(o, path) { return String(path).split(".").reduce(function (a, k) { return a == null ? undefined : a[k]; }, o); }
  function setLines(el, v) {
    while (el.firstChild) el.removeChild(el.firstChild);
    String(v).split(/\n|<br\s*\/?>/).forEach(function (part, i) {
      if (i) el.appendChild(document.createElement("br"));
      el.appendChild(document.createTextNode(part));
    });
  }
  function firstText(el) {
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) if (n.data.trim()) return n;
    return null;
  }
  function applyContent(c) {
    if (!c) return;
    var reType = false, reBlur = false, reVideo = false;
    Array.prototype.forEach.call(document.querySelectorAll("[data-cms]"), function (el) {
      var v = dig(c, el.getAttribute("data-cms"));
      if (v == null || v === "") return;
      var mode = el.getAttribute("data-cms-mode") || "text";
      if (mode === "href") { if (el.getAttribute("href") !== v) el.setAttribute("href", v); return; }
      if (mode === "src") { if (el.getAttribute("src") !== v) el.setAttribute("src", v); return; }
      if (mode === "video") { if (el.dataset.src !== v) { el.dataset.src = v; reVideo = true; } return; }
      if (mode === "mailto") { el.setAttribute("href", "mailto:" + v); var t = firstText(el); if (t) t.data = v; else setLines(el, v); return; }
      // a headline or typed paragraph must be un-split before it can be replaced, then re-animated
      if (el.__typeRec) { el.__typeRec = null; reType = true; setLines(el, v); return; }
      if (el.__blur) { el.__blur = null; reBlur = true; setLines(el, v); return; }
      var tn = firstText(el);
      if (mode !== "lines" && tn && tn.parentNode === el && el.childNodes.length === 1) tn.data = v;
      else setLines(el, v);
    });
    ENGINES.forEach(function (e) {
      if (reType) { e.typeRecs = e.typeRecs.filter(function (r) { return r.el.__typeRec === r; }); e.initType(e.root); }
      if (reBlur) { e.blurEls = e.blurEls.filter(function (x) { return x.__blur; }); e.initBlur(e.root); e.blurFallback(); }
      if (reVideo && e.rebindVideos) e.rebindVideos();
      anchorSlots(e.root);
      e.scheduleMeasure();
    });
  }
  window.ArengaContent = loadContent;
  window.ArengaApplyContent = applyContent;

  /* ---- footer "Dev Utilities": collapsible gate into the content panel ----
     A client-side check only hides the entrance; the panel's real protection is the GitHub token. */
  var DEV_U = atob("cG90cmVybw=="), DEV_P = atob("cG90cmVuZXRhMjAyNQ=="), ADMIN = "Arenga%20Admin.dc.html";
  function devSet(wrap, open) {
    var panel = wrap.querySelector("[data-dev-panel]"), btn = wrap.querySelector("[data-dev-toggle]"), caret = wrap.querySelector("[data-dev-caret]");
    wrap.setAttribute("data-open", open ? "1" : "0");
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (caret) caret.style.transform = open ? "rotate(180deg)" : "rotate(0deg)";
    if (!panel) return;
    panel.style.opacity = open ? "1" : "0";
    panel.style.pointerEvents = open ? "auto" : "none";
    panel.style.transform = open ? "translate3d(0,0,0)" : "translate3d(0,8px,0)";
    if (open) { var u = wrap.querySelector("[data-dev-user]"); if (u) setTimeout(function () { u.focus(); }, 60); }
  }
  function devTry(wrap) {
    var u = wrap.querySelector("[data-dev-user]"), p = wrap.querySelector("[data-dev-pass]"), msg = wrap.querySelector("[data-dev-msg]");
    var ok = u && p && u.value.trim().toLowerCase() === DEV_U && p.value === DEV_P;
    if (msg) { msg.textContent = ok ? "Entrando…" : "Usuario o contraseña incorrectos."; msg.style.color = ok ? "#28ea9b" : "#ff5715"; }
    if (!ok) { if (p) { p.value = ""; p.focus(); } return; }
    try { sessionStorage.setItem("arenga-dev", "1"); } catch (e) {}
    if (p) p.value = "";
    setTimeout(function () { if (typeof leaveTo === "function") leaveTo(ADMIN); else location.href = ADMIN; }, 260);
  }
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-dev-toggle],[data-dev-submit]") : null;
    if (t) {
      e.preventDefault();
      var wrap = t.closest("[data-dev]");
      if (!wrap) return;
      if (t.hasAttribute("data-dev-submit")) devTry(wrap);
      else devSet(wrap, wrap.getAttribute("data-open") !== "1");
      return;
    }
    // clicking anywhere else closes an open gate
    Array.prototype.forEach.call(document.querySelectorAll('[data-dev][data-open="1"]'), function (w) {
      if (!e.target || !e.target.closest || !e.target.closest("[data-dev]")) devSet(w, false);
    });
  });
  document.addEventListener("keydown", function (e) {
    var wrap = e.target && e.target.closest ? e.target.closest("[data-dev]") : null;
    if (e.key === "Escape") { Array.prototype.forEach.call(document.querySelectorAll('[data-dev][data-open="1"]'), function (w) { devSet(w, false); }); return; }
    if (e.key === "Enter" && wrap && e.target.matches("[data-dev-user],[data-dev-pass]")) { e.preventDefault(); devTry(wrap); }
  });

  /* ---- wide frames + vertical photos: <image-slot> emulates cover with its own transform, so a
     portrait gets centre-cropped and loses the head. Pin its crop to the top of the image instead.
     Runs on any source (file, data URL, late load) and leaves a hand-reframed slot alone. ---- */
  function anchorSlots(root) {
    var slots = root.querySelectorAll ? root.querySelectorAll("image-slot") : [];
    Array.prototype.forEach.call(slots, function (slot) {
      if (slot.__anchorBound) return;
      slot.__anchorBound = true;
      var apply = function () {
        if ((slot.getAttribute("fit") || "cover").toLowerCase() === "contain") return;
        var v = slot._view, img = slot.shadowRoot && slot.shadowRoot.querySelector("img");
        if (!v || !img || !img.naturalWidth) return;
        var fw = slot.clientWidth, fh = slot.clientHeight;
        if (!(fw > 40 && fh > 40) || fw / fh < 1.25) return;
        // only genuinely vertical photos: a square crest or a landscape still reads better centred
        if (img.naturalHeight / img.naturalWidth < 1.1) return;
        var pristine = v.x === 0 && v.y === 0 && v.s === 1;
        // pristine means the component just reset its own view (new src, re-render): re-anchor.
        // any other value that is not ours is the user's own reframe, so leave it alone.
        if (!pristine && (slot.__anchoredY === undefined || Math.abs(v.y - slot.__anchoredY) > 0.5)) return;
        if (!pristine) return;
        v.y = 1e6;
        if (slot._clampView) slot._clampView();
        if (slot._applyView) slot._applyView();
        slot.__anchoredY = v.y;
      };
      var applyAll = apply;
      apply = function () { applyAll(); balanceFrames(document); };
      slot.__anchorApply = apply;
      var bindImg = function () {
        var im = slot.shadowRoot && slot.shadowRoot.querySelector("img");
        if (!im || im.__anchorBound) return;
        im.__anchorBound = true;
        im.addEventListener("load", function () { requestAnimationFrame(apply); setTimeout(apply, 120); });
      };
      bindImg();
      requestAnimationFrame(function () { bindImg(); apply(); });
      // the panel resolves a draft image well after first paint, and the component resets its own
      // view on each re-render, so keep watching the source and the geometry for the slot's lifetime
      if (window.MutationObserver) {
        new MutationObserver(function () { bindImg(); requestAnimationFrame(apply); setTimeout(apply, 150); })
          .observe(slot, { attributes: true, attributeFilter: ["src", "data-filled", "data-swapping"] });
      }
      if (window.ResizeObserver) { var ro = new ResizeObserver(function () { apply(); }); ro.observe(slot); }
    });
  }
  /* A stills row is authored as two frames spanning 12 columns (7+5 / 5+7). When one of the two
     photos is a portrait, that frame narrows to 4 columns and its neighbour takes 8, so the vertical
     image keeps a near-portrait crop and the row still fills the grid. Heights stay as authored. */
  function balanceFrames(root) {
    var grids = {};
    Array.prototype.forEach.call(root.querySelectorAll('[data-reveal="frame"]'), function (el) {
      var p = el.parentElement;
      if (!p) return;
      if (el.__span0 === undefined) el.__span0 = el.style.gridColumn || "";
      var key = p.__gridKey || (p.__gridKey = "g" + Math.random().toString(36).slice(2));
      (grids[key] = grids[key] || { parent: p, items: [] }).items.push(el);
    });
    Object.keys(grids).forEach(function (k) {
      var items = grids[k].items, row = [], used = 0;
      var flush = function () {
        if (row.length === 2) {
          var o = row.map(function (el) {
            var img = el.querySelector("image-slot");
            img = img && img.shadowRoot && img.shadowRoot.querySelector("img");
            return img && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 0;
          });
          var portrait = [o[0] >= 1.1, o[1] >= 1.1];
          var span;
          if (portrait[0] && portrait[1]) span = ["span 6", "span 6"];
          else if (portrait[0]) span = ["span 4", "span 8"];
          else if (portrait[1]) span = ["span 8", "span 4"];
          if (span) row.forEach(function (el, i) { if (el.style.gridColumn !== span[i]) el.style.gridColumn = span[i]; });
          else row.forEach(function (el) { if (el.style.gridColumn !== el.__span0) el.style.gridColumn = el.__span0; });
        }
        row = []; used = 0;
      };
      items.forEach(function (el) {
        var m = /span\s+(\d+)/.exec(el.__span0 || "");
        var n = m ? Number(m[1]) : 12;
        row.push(el); used += n;
        if (used >= 12) flush();
      });
      flush();
    });
  }
  window.ArengaBalanceFrames = balanceFrames;
  window.ArengaAnchorSlots = anchorSlots;

  /* ---- mobile menu ---- */
  function menuEl() { return document.querySelector("[data-menu]"); }
  function setMenu(open) {
    var m = menuEl(); if (!m) return;
    m.setAttribute("data-open", open ? "1" : "0");
    m.style.opacity = open ? "1" : "0";
    m.style.pointerEvents = open ? "auto" : "none";
    m.style.transform = open ? "translate3d(0,0,0)" : "translate3d(0,-14px,0)";
    var items = m.querySelectorAll("[data-menu-item]");
    for (var i = 0; i < items.length; i++) {
      items[i].style.transitionDelay = open ? (80 + i * 55) + "ms" : "0ms";
      items[i].style.opacity = open ? "1" : "0";
      items[i].style.transform = open ? "translate3d(0,0,0)" : "translate3d(0,22px,0)";
    }
    document.documentElement.style.overflow = open ? "hidden" : "";
  }
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-menu-toggle]") : null;
    if (!t) return;
    var m = menuEl(); if (!m) return;
    setMenu(m.getAttribute("data-open") !== "1");
  });

  /* ---- link interception (curtain) + click suppression after a drag ---- */
  var suppressUntil = 0;
  window.__arengaSuppressClick = function (ms) { suppressUntil = performance.now() + (ms || 350); };
  document.addEventListener("click", function (e) {
    if (performance.now() < suppressUntil) { e.preventDefault(); e.stopPropagation(); return; }
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    if (a.closest("[data-menu]")) setMenu(false);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== "_self") return;
    var href = a.getAttribute("href") || "";
    if (!/\.dc\.html/i.test(href)) return;
    var url; try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin || url.pathname === location.pathname) return;
    e.preventDefault();
    leaveTo(url.href);
  }, true);

  /* ---- motion engine: background tint, reveals, floating nav, footer entrance, marquees, tilt, blur + type reveals ---- */
  class Engine {
    constructor(root, opts) {
      this.root = root;
      this.opts = Object.assign({ gate: false, typewriter: true, typeSpeed: 1, onFrame: null, onMeasure: null }, opts || {});
      this.gate = !!this.opts.gate;
      this.mq = window.matchMedia ? window.matchMedia("(max-width: 760px)") : null;
      this.bgs = []; this.reveals = []; this.marquees = []; this.blurEls = []; this.typeRecs = [];
      this.lastY = -1; this.lastT = 0; this.wake = 4; this.dead = false; this.measureT = 0;
      this.onResize = () => { this.scheduleMeasure(); clearTimeout(this.typeT); this.typeT = setTimeout(() => this.remeasureType(), 140); };
      window.addEventListener("resize", this.onResize);
      if (this.mq && this.mq.addEventListener) this.mq.addEventListener("change", this.onResize);
      if (window.ResizeObserver) { this.ro = new ResizeObserver(() => this.scheduleMeasure()); this.ro.observe(root); }
      if (window.MutationObserver) {
        this.mo = new MutationObserver(() => { clearTimeout(this.rebindT); this.rebindT = setTimeout(() => this.rebind(), 80); });
        this.mo.observe(root, { childList: true, subtree: true });
      }
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!this.dead) { this.remeasureType(); this.scheduleMeasure(); } });
      this.cache();
      ENGINES.push(this);
      loadContent().then(applyContent);
      this.blurSafety = setTimeout(() => this.blurFallback(), 3200);
      this.raf = requestAnimationFrame((t) => this.frame(t));
    }
    get mobile() { return !!(this.mq && this.mq.matches); }
    destroy() {
      this.dead = true;
      cancelAnimationFrame(this.raf); cancelAnimationFrame(this.measureT);
      clearTimeout(this.blurSafety); clearTimeout(this.typeT);
      window.removeEventListener("resize", this.onResize);
      if (this.mq && this.mq.removeEventListener) this.mq.removeEventListener("change", this.onResize);
      if (this.ro) this.ro.disconnect();
      if (this.mo) this.mo.disconnect();
      clearTimeout(this.rebindT);
      if (this.blurIO) this.blurIO.disconnect();
      if (this.frameIO) this.frameIO.disconnect();
      clearTimeout(this.frameSafety);
      if (this.videoIO) this.videoIO.disconnect();
      if (this.embedIO) this.embedIO.disconnect();
      if (this.typeIO) this.typeIO.disconnect();
      this.marquees.forEach(m => m.unbind && m.unbind());
      if (this.onPtr) { document.removeEventListener("pointermove", this.onPtr); document.documentElement.removeEventListener("mouseleave", this.onPtrOut); }
    }
    release() {
      this.gate = false;
      this.typeRecs.forEach(rec => { if (rec.want) { rec.target = rec.total; if (this.typeIO) this.typeIO.unobserve(rec.el); } });
      this.blurEls.forEach(el => { if (el.__blur && (el.__blur.want || el.dataset.blur === "hero")) this.setBlur(el, true); });
    }
    /* new nodes (streamed list items, hot template edits) get the same bindings; all binders skip what they already own */
    rebind() {
      if (this.dead) return;
      const r = this.root;
      this.bindHover(r); this.initBlur(r); this.initType(r); this.initMarquees(r); this.initVideos(r); anchorSlots(r);
      this.bgs = Array.from(r.querySelectorAll("[data-bg]")).map(el => ({ el, f: parseFloat(el.dataset.parallax) || 0, tint: el.dataset.bg, base: parseFloat(el.dataset.opacity || "1") }));
      this.reveals = Array.from(r.querySelectorAll("[data-reveal]")).filter(el => el.dataset.reveal !== "frame").map(el => ({ el, f: parseFloat(el.dataset.par) || 0, top: 0, h: 0 }));
      this.initFrames(r);
      this.footer = r.querySelector("[data-footer]");
      this.footerBlur = this.footer ? this.footer.querySelector("[data-blur]") : null;
      this.navFloat = r.querySelector("[data-nav-float]");
      if (this.mo) this.mo.takeRecords();
      this.scheduleMeasure();
    }
    layoutTop(el, ty) { return el.getBoundingClientRect().top + (window.scrollY || 0) - (ty || 0); }
    scheduleMeasure() { if (this.measureT) return; this.measureT = requestAnimationFrame(() => { this.measureT = 0; this.measure(); }); }
    cache() {
      const r = this.root;
      this.bgs = Array.from(r.querySelectorAll("[data-bg]")).map(el => ({ el, f: parseFloat(el.dataset.parallax) || 0, tint: el.dataset.bg, base: parseFloat(el.dataset.opacity || "1") }));
      this.reveals = Array.from(r.querySelectorAll("[data-reveal]")).filter(el => el.dataset.reveal !== "frame").map(el => ({ el, f: parseFloat(el.dataset.par) || 0, top: 0, h: 0 }));
      this.initFrames(r);
      this.footer = r.querySelector("[data-footer]");
      this.footerBlur = this.footer ? this.footer.querySelector("[data-blur]") : null;
      this.navFloat = r.querySelector("[data-nav-float]");
      this.bindHover(r); this.initBlur(r); this.initType(r); this.initMarquees(r); this.initVideos(r); anchorSlots(r);
      this.measure();
    }
    measure() {
      const y = window.scrollY || 0;
      for (const rv of this.reveals) { const rect = rv.el.getBoundingClientRect(); rv.top = rect.top + y - (rv.el.__py || 0); rv.h = rect.height; }
      if (this.footer) this.footerTop = this.footer.getBoundingClientRect().top + y - (this.footer.__ty || 0);
      for (const m of this.marquees) { const rect = m.el.getBoundingClientRect(); m.top = rect.top + y; m.h = rect.height; m.period = m.track.scrollWidth / m.copies; }
      this.docH = document.documentElement.scrollHeight;
      this.wake = 4;
      if (this.opts.onMeasure) this.opts.onMeasure(y);
    }
    frame(t) {
      if (document.hidden) { this.lastT = 0; this.raf = requestAnimationFrame((ts) => this.frame(ts)); return; }
      this.raf = requestAnimationFrame((ts) => this.frame(ts));
      const now = t || 0, dt = this.lastT ? Math.min(64, now - this.lastT) : 16;
      this.lastT = now; this.dt = dt;
      const y = window.scrollY || 0, vh = window.innerHeight;
      const scrolled = y !== this.lastY;
      this.lastY = y;
      this.tickType(dt);
      this.tickMarquees(dt, y, vh);
      this.tickHover(dt, y, scrolled);
      if (scrolled || this.wake > 0) { this.applyScroll(y, vh); if (!scrolled) this.wake--; }
      if (this.opts.onFrame) this.opts.onFrame(dt, y, vh, scrolled, now);
    }
    applyScroll(y, vh) {
      const span = Math.max(1, (this.docH || 1) - vh), prog = Math.min(1, Math.max(0, y / span));
      for (const n of this.bgs) {
        if (n.f) n.el.style.transform = "translate3d(0," + (y * n.f).toFixed(1) + "px,0)";
        const k = n.tint === "warm" ? (1 - prog * 0.7) : n.tint === "cool" ? (0.7 + prog * 0.45) : 1;
        n.el.style.opacity = Math.min(1, n.base * k).toFixed(3);
      }
      if (this.navFloat) {
        const dy = this.navLastY === undefined ? 0 : y - this.navLastY;
        this.navLastY = y;
        let show = this.navShown === true;
        if (dy > 4 || y < 140) show = false; else if (dy < -4 && y > vh * 0.5) show = true;
        if (show !== this.navShown) {
          this.navShown = show;
          this.navFloat.style.opacity = show ? "1" : "0";
          this.navFloat.style.transform = show ? "translate3d(0,0,0)" : "translate3d(0,-130%,0)";
        }
      }
      if (this.footer) {
        const top = this.footerTop - y;
        const p = Math.min(1, Math.max(0, (vh - top) / (vh * 0.5))), e = 1 - Math.pow(1 - p, 3);
        const ty = (1 - e) * vh * 0.12;
        this.footer.__ty = ty;
        this.footer.style.transform = "translate3d(0," + ty.toFixed(1) + "px,0)";
        this.footer.style.opacity = (0.5 + 0.5 * e).toFixed(3);
        // the footer headline reveals with the panel itself, so it is never a blank block
        if (p > 0.1 && this.footerBlur) this.setBlur(this.footerBlur, true);
      }
      for (const rv of this.reveals) {
        const top = rv.top - y;
        if (top > vh + 200 || top + rv.h < -400) continue;
        const raw = (vh - top - vh * 0.12) / (vh * 0.42);
        const p = Math.min(1, Math.max(0, raw - rv.delay)), e = 1 - Math.pow(1 - p, 3);
        const d = top + rv.h / 2 - vh / 2, py = (1 - e) * 46 + d * rv.f;
        rv.el.__py = py;
        rv.el.style.opacity = String(0.05 + e * 0.95);
        rv.el.style.transform = "translate3d(0," + py.toFixed(1) + "px,0)" + (rv.el.__hoverTf || "");
      }
    }
    /* marquee: a track duplicated N times slides right-to-left, pauses under the mouse, drags with inertia */
    initMarquees(root) {
      Array.from(root.querySelectorAll("[data-marquee]")).forEach(el => {
        if (el.__mq) return;
        const track = el.querySelector("[data-marquee-track]");
        if (!track) return;
        const m = { el, track, x: 0, vel: 0, speed: (parseFloat(el.dataset.speed) || 60) / 1000, copies: parseInt(el.dataset.copies || "2", 10) || 2, paused: false, drag: false, period: 0, top: 0, h: 0, moved: 0, dragVel: 0 };
        el.__mq = m;
        this.marquees.push(m);
        const enter = (e) => { if (e.pointerType === "mouse") m.paused = true; };
        const leave = () => { m.paused = false; };
        const down = (e) => { if (e.button) return; m.drag = true; m.moved = 0; m.lastX = e.clientX; m.lastT = performance.now(); m.dragVel = 0; };
        const move = (e) => {
          if (!m.drag) return;
          const now = performance.now(), dx = e.clientX - m.lastX, dtm = Math.max(1, now - m.lastT);
          m.lastX = e.clientX; m.lastT = now; m.x += dx; m.moved += Math.abs(dx);
          m.dragVel = Math.max(-2.5, Math.min(2.5, dx / dtm));
        };
        const up = () => { if (!m.drag) return; m.drag = false; m.vel = m.dragVel; if (m.moved > 6 && window.__arengaSuppressClick) window.__arengaSuppressClick(400); };
        el.addEventListener("pointerenter", enter); el.addEventListener("pointerleave", leave); el.addEventListener("pointerdown", down);
        window.addEventListener("pointermove", move, { passive: true }); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
        m.unbind = () => { el.removeEventListener("pointerenter", enter); el.removeEventListener("pointerleave", leave); el.removeEventListener("pointerdown", down); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };
      });
    }
    tickMarquees(dt, y, vh) {
      for (const m of this.marquees) {
        if (!(m.period > 0)) continue;
        if (m.top - y > vh + 100 || m.top + m.h - y < -100) continue;
        if (!m.drag) { const target = m.paused ? 0 : -m.speed; m.vel += (target - m.vel) * (1 - Math.exp(-dt / 700)); m.x += m.vel * dt; }
        if (m.x <= -m.period) m.x += m.period; else if (m.x > 0) m.x -= m.period;
        m.track.style.transform = "translate3d(" + m.x.toFixed(2) + "px,0,0)";
      }
    }
    /* hover motion (magnet / tilt / glass sheen) driven from the document pointer against each card's own box:
       independent of whatever sits under the pointer (shadow DOM, overlays) and with hysteresis so corners never flicker */
    bindHover(root) {
      if (!this.hoverEls) {
        this.hoverEls = [];
        this.ptr = { x: -1e4, y: -1e4, moved: false };
        this.onPtr = (e) => { if (e.pointerType && e.pointerType !== "mouse") return; this.ptr.x = e.clientX; this.ptr.y = e.clientY; this.ptr.moved = true; };
        this.onPtrOut = () => { this.ptr.x = -1e4; this.ptr.y = -1e4; this.ptr.moved = true; };
        document.addEventListener("pointermove", this.onPtr, { passive: true });
        document.documentElement.addEventListener("mouseleave", this.onPtrOut);
      }
      Array.from(root.querySelectorAll("[data-magnet], [data-tilt], [data-glass]")).forEach(el => {
        if (el.__hover) return;
        const kind = el.hasAttribute("data-magnet") ? "magnet" : el.hasAttribute("data-tilt") ? "tilt" : "glass";
        const amp = parseFloat(el.dataset.magnet || el.dataset.tilt) || 1;
        const cs = getComputedStyle(el);
        if (cs.position === "static") el.style.position = "relative";
        if (cs.overflow === "visible") el.style.overflow = "hidden";
        if (kind !== "glass") {
          // the frame loop owns transform from here on; a CSS transition on it would only lag behind
          const tr = (el.style.transition || cs.transition || "").split(/,(?![^()]*\))/).map(s => s.trim()).filter(s => s && !/^(transform|all)\b/.test(s));
          el.style.transition = tr.join(", ");
        }
        const holo = document.createElement("div");
        holo.setAttribute("data-holo", "1");
        holo.style.cssText = "position:absolute;inset:0;pointer-events:none;opacity:0;mix-blend-mode:screen;background-size:260% 260%;background-position:50% 50%;background-image:linear-gradient(118deg, rgba(255,87,21,0) 12%, rgba(255,87,21,0.42) 26%, rgba(255,236,220,0.3) 38%, rgba(40,234,155,0.4) 52%, rgba(40,234,155,0.26) 66%, rgba(255,87,21,0.24) 78%, rgba(255,87,21,0) 92%);";
        const glare = document.createElement("div");
        glare.setAttribute("data-glare", "1");
        glare.style.cssText = "position:absolute;inset:0;pointer-events:none;opacity:0;mix-blend-mode:screen;";
        el.appendChild(holo); el.appendChild(glare);
        el.__hover = { el, kind, amp, holo, glare, on: 0, px: 0, py: 0, tx: 0, ty: 0, w: 0, h: 0, hit: false, idle: true, r: null };
        this.hoverEls.push(el.__hover);
      });
    }
    hoverZ(el) {
      let n = el, d = 0;
      while (n && d < 6) { const z = parseFloat(n.style.zIndex); if (!isNaN(z)) return z; n = n.parentElement; d++; }
      return 0;
    }
    tickHover(dt, y, scrolled) {
      const hs = this.hoverEls;
      if (!hs || !hs.length || !FINE.matches) return;
      const moved = this.ptr.moved;
      this.ptr.moved = false;
      if (!(moved || scrolled || this.hoverAnim)) return;
      const px = this.ptr.x, py = this.ptr.y, vh = window.innerHeight;
      let winner = null, wz = -1e9;
      for (const h of hs) {
        const el = h.el;
        h.hit = false;
        if (!el.isConnected || el.style.pointerEvents === "none" || (el.parentElement && el.parentElement.style.pointerEvents === "none")) continue;
        const r = el.getBoundingClientRect();
        if (!(r.width > 0) || r.bottom < -40 || r.top > vh + 40) continue;
        const m = h.on > 0.5 ? Math.max(14, Math.min(r.width, r.height) * 0.08) : 0;
        if (px < r.left - m || px > r.right + m || py < r.top - m || py > r.bottom + m) continue;
        h.hit = true; h.r = r;
        const z = this.hoverZ(el);
        if (z >= wz) { wz = z; winner = h; }
      }
      let anim = false;
      for (const h of hs) {
        const on = !!winner && h.hit && (h === winner || h.el.contains(winner.el));
        if (on) {
          const r = h.r;
          h.px = Math.max(-0.5, Math.min(0.5, (px - r.left) / r.width - 0.5));
          h.py = Math.max(-0.5, Math.min(0.5, (py - r.top) / r.height - 0.5));
          h.w = r.width; h.h = r.height;
        }
        const target = on ? 1 : 0;
        const dOn = target - h.on, dX = on ? h.px - h.tx : 0, dY = on ? h.py - h.ty : 0;
        if (Math.abs(dOn) < 0.004 && Math.abs(dX) < 0.002 && Math.abs(dY) < 0.002) {
          if (!h.idle) { h.idle = true; h.on = target; if (on) { h.tx = h.px; h.ty = h.py; } this.writeHover(h); }
          continue;
        }
        h.idle = false; anim = true;
        const k = 1 - Math.exp(-dt / (on ? 120 : 240));
        h.on += dOn * k; h.tx += dX * k; h.ty += dY * k;
        this.writeHover(h);
      }
      this.hoverAnim = anim;
    }
    /* the corner under the pointer sinks (weight); a magnet card also slides toward the pointer; the sheen only lives around the pointer */
    writeHover(h) {
      const el = h.el, o = h.on, a = h.amp, tx = h.tx, ty = h.ty;
      if (h.kind !== "glass") {
        let tf;
        if (h.kind === "magnet") tf = " translate3d(" + (tx * 26 * a * o).toFixed(1) + "px," + ((ty * 20 * a - 6) * o).toFixed(1) + "px,0) perspective(1400px) rotateX(" + (-ty * 11 * a * o).toFixed(2) + "deg) rotateY(" + (tx * 13 * a * o).toFixed(2) + "deg) scale(" + (1 + 0.035 * o).toFixed(4) + ")";
        else if (el.__tfPre !== undefined) tf = " rotateX(" + (-ty * 16 * a * o).toFixed(2) + "deg) rotateY(" + (tx * 18 * a * o).toFixed(2) + "deg) translate3d(0,0," + (-(14 + (Math.abs(tx) + Math.abs(ty)) * 16) * o).toFixed(1) + "px)";
        else tf = " perspective(1200px) rotateX(" + (-ty * 12 * a * o).toFixed(2) + "deg) rotateY(" + (tx * 14 * a * o).toFixed(2) + "deg) translateY(" + (-4 * o).toFixed(1) + "px)";
        el.__hoverTf = o < 0.002 ? "" : tf;
        if (el.__tfPre !== undefined) el.style.transform = el.__tfPre + el.__hoverTf + el.__tfPost;
        else el.style.transform = (el.__py ? "translate3d(0," + el.__py.toFixed(1) + "px,0)" : "") + el.__hoverTf;
      }
      const X = ((tx + 0.5) * 100).toFixed(1) + "% " + ((ty + 0.5) * 100).toFixed(1) + "%";
      const rad = Math.round(Math.max(200, Math.min(h.w || 300, h.h || 300) * 0.9));
      const mask = "radial-gradient(" + rad + "px " + rad + "px at " + X + ", #000 0%, rgba(0,0,0,0.5) 48%, transparent 80%)";
      h.holo.style.opacity = (o * (h.kind === "glass" ? 0.85 : 0.7)).toFixed(3);
      h.holo.style.backgroundPosition = X;
      h.holo.style.maskImage = mask; h.holo.style.webkitMaskImage = mask;
      h.glare.style.opacity = o.toFixed(3);
      h.glare.style.background = "radial-gradient(" + Math.round(rad * 0.85) + "px " + Math.round(rad * 0.85) + "px at " + X + ", rgba(255,255,255,0.22), transparent 68%)";
    }
    rebindVideos() {
      Array.from(this.root.querySelectorAll("[data-video]")).forEach(card => {
        const f = card.querySelector("iframe");
        if (f) f.remove();
        card.dataset.videoBound = "";
        const v = card.querySelector("video");
        if (v) { v.__ok = false; v.style.display = ""; v.style.opacity = "0"; }
        const bar = card.querySelector("[data-video-bar]");
        if (bar) bar.style.display = "";
      });
      this.initVideos(this.root);
    }
    /* [data-video] cards: a muted clip loops over the poster image; pauses off-screen, removes itself
       when the file is missing, and the glass button toggles sound (or starts playback with sound) */
    initVideos(root) {
      const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!this.videoIO) this.videoIO = new IntersectionObserver(entries => {
        entries.forEach(en => {
          const v = en.target;
          if (!v.__ok) return;
          if (en.isIntersecting) { if (v.__wantPlay) v.play().catch(() => {}); } else v.pause();
        });
      }, { threshold: 0 });
      Array.from(root.querySelectorAll("[data-video]")).forEach(card => {
        if (card.dataset.videoBound === "1") return;
        card.dataset.videoBound = "1";
        const v = card.querySelector("video");
        // the panel can point this card at another case: re-bind when its source changes
        if (v && window.MutationObserver && !v.__srcMO) {
          v.__srcMO = new MutationObserver(() => {
            if ((v.dataset.src || "").trim() === (v.__boundSrc || "")) return;
            clearTimeout(v.__srcT);
            v.__srcT = setTimeout(() => this.rebindVideos(), 60);
          });
          v.__srcMO.observe(v, { attributes: true, attributeFilter: ["data-src"] });
        }
        const btn = card.querySelector("[data-video-bar]") || card.querySelector("[data-video-sound]");
        const soundBtn = card.querySelector("[data-video-sound]");
        const fullBtn = card.querySelector("[data-video-full]");
        const ic = (k) => card.querySelector("[data-video-icon='" + k + "']");
        const onI = ic("on"), offI = ic("off"), playI = ic("play");
        const setIcons = () => {
          const paused = !v || v.paused;
          if (playI) playI.style.display = paused ? "inline-flex" : "none";
          if (offI) offI.style.display = (!paused && v.muted) ? "inline-flex" : "none";
          if (onI) onI.style.display = (!paused && !v.muted) ? "inline-flex" : "none";
        };
        const path = v && v.dataset.src;
        if (v) v.__boundSrc = (path || "").trim();
        if (!v || !path) { if (btn) btn.style.display = "none"; if (v) v.style.display = "none"; return; }
        const fail = () => { v.__ok = false; v.style.display = "none"; if (btn) btn.style.display = "none"; };
        v.addEventListener("error", fail);
        // a YouTube/Vimeo link plays through its own embed (muted, looped, no chrome) instead of <video>
        const embed = (function () {
          var m = path.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
          if (m) return { kind: "yt", url: "https://www.youtube-nocookie.com/embed/" + m[1] + "?autoplay=1&mute=1&loop=1&playlist=" + m[1] + "&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1" };
          m = path.match(/vimeo\.com\/(?:video\/)?(\d+)/);
          if (m) return { kind: "vimeo", url: "https://player.vimeo.com/video/" + m[1] + "?autoplay=1&muted=1&loop=1&controls=0&title=0&byline=0&portrait=0&dnt=1&playsinline=1" };
          return null;
        })();
        if (embed) {
          v.style.display = "none";
          const f = document.createElement("iframe");
          f.src = embed.url;
          f.setAttribute("allow", "autoplay; fullscreen; picture-in-picture");
          f.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
          f.setAttribute("title", v.getAttribute("aria-label") || "Video");
          f.style.cssText = "position:absolute;left:50%;top:50%;width:100%;height:100%;transform:translate(-50%,-50%);border:0;pointer-events:none;";
          v.parentNode.insertBefore(f, v);
          // players letterbox inside their frame, so size the iframe to cover the card instead
          const fit = () => {
            // offsetWidth/Height, not the rect: the card is often mid-transform (stack flip, magnet) when this runs
            const w = card.offsetWidth, hh = card.offsetHeight;
            if (!(w > 0 && hh > 0)) return;
            const ar = 16 / 9, over = 12;
            if (w / hh > ar) { f.style.width = (w + over) + "px"; f.style.height = Math.ceil((w + over) / ar) + "px"; }
            else { f.style.height = (hh + over) + "px"; f.style.width = Math.ceil((hh + over) * ar) + "px"; }
            // no light card gradient may peek at the edges behind a video
            card.style.backgroundImage = "none";
            card.style.backgroundColor = "#0b0e13";
          };
          fit();
          if (window.ResizeObserver) { const ro = new ResizeObserver(fit); ro.observe(card); }
          else window.addEventListener("resize", fit);
          // the embed keeps no chrome; sound is driven through the player's postMessage API.
          // unmuting a cross-origin player loses the click gesture, so every change re-issues play.
          let muted = true;
          const cmd = (o) => { const w = f.contentWindow; if (w) w.postMessage(JSON.stringify(o), embed.kind === "vimeo" ? "https://player.vimeo.com" : "*"); };
          const send = (vol) => {
            if (embed.kind === "vimeo") {
              cmd({ method: "setMuted", value: !vol });
              cmd({ method: "setVolume", value: vol });
              cmd({ method: "play" });
              setTimeout(() => cmd({ method: "play" }), 220);
            } else {
              cmd({ event: "command", func: vol ? "unMute" : "mute", args: [] });
              cmd({ event: "command", func: "setVolume", args: [vol * 100] });
              cmd({ event: "command", func: "playVideo", args: [] });
              setTimeout(() => cmd({ event: "command", func: "playVideo", args: [] }), 220);
            }
          };
          if (playI) playI.style.display = "none";
          if (offI) offI.style.display = "inline-flex";
          if (onI) onI.style.display = "none";
          if (soundBtn) soundBtn.addEventListener("click", (e) => {
            e.preventDefault(); e.stopPropagation();
            muted = !muted;
            send(muted ? 0 : 1);
            if (offI) offI.style.display = muted ? "inline-flex" : "none";
            if (onI) onI.style.display = muted ? "none" : "inline-flex";
          });
          if (fullBtn) fullBtn.addEventListener("click", (e) => {
            e.preventDefault(); e.stopPropagation();
            const idm = embed.url.match(embed.kind === "vimeo" ? /video\/(\d+)/ : /embed\/([\w-]+)/);
            const wasOn = !muted;
            if (wasOn) send(0);
            openVideoLightbox(embed.kind, idm && idm[1], null, v.getAttribute("aria-label"), () => { if (wasOn) send(1); });
          });
          // an unmuted embed must not keep playing once the card scrolls away
          if (!this.embedIO) this.embedIO = new IntersectionObserver(entries => {
            entries.forEach(en => { const t = en.target.__embed; if (t) t.vis(en.isIntersecting); });
          }, { threshold: 0 });
          const vis = (on) => {
            if (embed.kind === "vimeo") cmd({ method: on ? "play" : "pause" });
            else cmd({ event: "command", func: on ? "playVideo" : "pauseVideo", args: [] });
          };
          card.__videoCtl = { play: () => vis(true), pause: () => vis(false) };
          if (card.dataset.videoManual === "1") { vis(false); setTimeout(() => vis(false), 500); }
          else { f.__embed = { vis }; this.embedIO.observe(f); }
          return;
        }
        if (fullBtn) fullBtn.addEventListener("click", (e) => {
          e.preventDefault(); e.stopPropagation();
          const wasMuted = v.muted, wasPlaying = !v.paused;
          v.muted = true; v.pause();
          openVideoLightbox("file", null, path, v.getAttribute("aria-label"), () => {
            v.muted = wasMuted;
            if (wasPlaying) v.play().catch(() => {});
            setIcons();
          });
        });
        card.__videoCtl = { play: () => { v.__wantPlay = true; if (v.__ok) v.play().catch(() => {}); }, pause: () => { v.__wantPlay = false; v.pause(); } };
        if (card.dataset.videoManual === "1") v.__manual = true;
        v.addEventListener("loadeddata", () => { v.__ok = true; v.style.opacity = "1"; setIcons(); });
        v.addEventListener("play", setIcons);
        v.addEventListener("pause", setIcons);
        v.muted = true;
        v.__wantPlay = !reduce;
        setIcons();
        // ask for the file first: a missing clip must not surface as a console error on every case page
        // the <source> is created only once the file is confirmed: an empty/missing source fires a load error
        fetch(path, { method: "HEAD" }).then(r => {
          if (!r.ok) throw 0;
          const s = document.createElement("source");
          s.type = "video/mp4"; s.src = path;
          v.appendChild(s); v.load();
          if (!reduce) v.play().catch(() => {});
        }).catch(fail);
        if (soundBtn) soundBtn.addEventListener("click", (e) => {
          e.preventDefault(); e.stopPropagation();
          if (v.paused) { v.__wantPlay = true; v.muted = false; v.play().catch(() => {}); }
          else v.muted = !v.muted;
          setIcons();
        });
        this.videoIO.observe(v);
      });
    }
    /* framed stills (case galleries): one smooth transition the first time each enters view */
    initFrames(root) {
      if (!this.frameIO) this.frameIO = new IntersectionObserver(entries => {
        entries.forEach(en => { if (en.isIntersecting) this.showFrame(en.target); });
      }, { rootMargin: "-6% 0px -6% 0px", threshold: 0 });
      Array.from(root.querySelectorAll('[data-reveal="frame"]')).forEach(el => {
        if (el.__frameBound) return;
        el.__frameBound = true;
        const inner = el.querySelector("image-slot, img");
        if (inner) { inner.style.clipPath = "none"; inner.style.transform = "none"; }
        el.style.transition = "none";
        el.style.opacity = "0";
        el.style.transform = "translate3d(0,26px,0)";
        this.frameIO.observe(el);
      });
      clearTimeout(this.frameSafety);
      this.frameSafety = setTimeout(() => this.frameFallback(), 2600);
    }
    showFrame(el) {
      if (el.__revealShown) return;
      el.__revealShown = true;
      const delay = Math.round((parseFloat(el.dataset.rdelay) || 0) * 900);
      el.style.transition = "opacity 900ms cubic-bezier(.22,.61,.36,1) " + delay + "ms, transform 1100ms cubic-bezier(.22,.61,.36,1) " + delay + "ms";
      el.style.opacity = "1";
      el.style.transform = "translate3d(0,0,0)";
      setTimeout(() => { el.style.willChange = "auto"; }, 1250 + delay);
      if (this.frameIO) this.frameIO.unobserve(el);
    }
    // nothing may stay invisible: whatever is on screen after the layout settles gets shown
    frameFallback() {
      const vh = window.innerHeight;
      Array.from(this.root.querySelectorAll('[data-reveal="frame"]')).forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.top < vh && r.bottom > 0) this.showFrame(el);
      });
    }
    /* headlines: each word settles in from a blur, once */
    initBlur(root) {
      this.blurEls = this.blurEls.filter(el => el.isConnected);
      if (!this.blurIO) this.blurIO = new IntersectionObserver(entries => { entries.forEach(en => { if (en.isIntersecting) this.setBlur(en.target, true); }); }, { rootMargin: "-8% 0px -8% 0px", threshold: 0 });
      Array.from(root.querySelectorAll("[data-blur]")).forEach(el => {
        if (el.__blur) return;
        const tns = [];
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        let tn;
        while ((tn = walker.nextNode())) if (tn.data.trim()) tns.push(tn);
        const words = [];
        tns.forEach(t => {
          const frag = document.createDocumentFragment();
          t.data.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const s = document.createElement("span");
            s.textContent = part;
            s.style.cssText = "display:inline-block;will-change:filter,transform,opacity;filter:blur(18px);opacity:0;transform:translate3d(0,0.12em,0) scale(1.05);";
            words.push(s); frag.appendChild(s);
          });
          t.parentNode.replaceChild(frag, t);
        });
        el.__blur = { words, on: false, want: false };
        this.blurEls.push(el);
        if (el.dataset.blur === "1") this.blurIO.observe(el);
      });
    }
    setBlur(el, on) {
      const b = el && el.__blur;
      if (!b || b.on === on) return;
      if (on && this.gate) { b.want = true; return; }
      b.on = on;
      b.words.forEach((w, i) => {
        const d = (i * 45) + "ms";
        w.style.transition = "filter 760ms " + EZ + " " + d + ", opacity 520ms ease " + d + ", transform 760ms " + EZ + " " + d;
        w.style.filter = on ? "blur(0px)" : "blur(18px)";
        w.style.opacity = on ? "1" : "0";
        w.style.transform = on ? "translate3d(0,0,0) scale(1)" : "translate3d(0,0.12em,0) scale(1.05)";
        if (on) setTimeout(() => { w.style.willChange = "auto"; }, 1300 + i * 70);
      });
      if (on && this.blurIO && el.dataset.blur === "1") this.blurIO.unobserve(el);
    }
    blurFallback() {
      if (this.gate) return;
      const vh = window.innerHeight;
      this.blurEls.forEach(el => { const r = el.getBoundingClientRect(); if (r.top < vh && r.bottom > 0) this.setBlur(el, true); });
    }
    /* typewriter paragraphs: the full text stays in the DOM (the untyped tail is only visibility:hidden), so layout
       is final from the first paint and crawlers/readers always see the whole sentence */
    initType(root) {
      this.typeRecs = this.typeRecs.filter(rec => rec.el.isConnected);
      if (!this.typeIO) this.typeIO = new IntersectionObserver(entries => { entries.forEach(en => { const rec = en.target.__typeRec; if (rec && en.isIntersecting) this.setTypeWant(rec); }); }, { rootMargin: "-14% 0px 0px 0px", threshold: 0 });
      Array.from(root.querySelectorAll("[data-type]")).forEach(el => {
        if (el.__typeRec) return;
        const tns = [];
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        let tn;
        while ((tn = walker.nextNode())) {
          if (tn.parentElement && tn.parentElement.closest("[data-type-caret],[data-type-node]")) continue;
          if (!tn.data.trim()) continue;
          tns.push(tn);
        }
        const nodes = tns.map(t => {
          const wrap = document.createElement("span"); wrap.setAttribute("data-type-node", "1");
          const done = document.createElement("span");
          const rest = document.createElement("span"); rest.style.visibility = "hidden"; rest.textContent = t.data;
          wrap.appendChild(done); wrap.appendChild(rest);
          t.parentNode.replaceChild(wrap, t);
          return { done, rest, full: t.data, len: t.data.length, shown: 0 };
        });
        const total = nodes.reduce((s, n) => s + n.len, 0);
        if (!total) return;
        const caret = document.createElement("span");
        caret.setAttribute("data-type-caret", "1");
        caret.setAttribute("aria-hidden", "true");
        caret.style.cssText = "display:inline-block;width:0.56em;height:0.8em;margin-left:0.08em;vertical-align:-0.06em;background:#f4f2ee;border-radius:1px;box-shadow:0 0 12px rgba(244,242,238,0.5);pointer-events:none;";
        const rec = { el, nodes, total, k: 0, target: 0, want: false, caret, blinkT: 9999 };
        el.__typeRec = rec;
        this.typeRecs.push(rec);
        this.typeIO.observe(el);
      });
    }
    setTypeWant(rec) { rec.want = true; if (this.gate) return; rec.target = rec.total; if (this.typeIO) this.typeIO.unobserve(rec.el); }
    remeasureType() {}
    writeType(r) {
      const shown = Math.round(r.k);
      let acc = 0, caretNode = r.nodes[0];
      for (let j = 0; j < r.nodes.length; j++) {
        const n = r.nodes[j];
        const c = Math.max(0, Math.min(n.len, shown - acc));
        if (n.shown !== c) { n.shown = c; n.done.textContent = n.full.slice(0, c); n.rest.textContent = n.full.slice(c); }
        if (c > 0) caretNode = n;
        acc += n.len;
      }
      return caretNode;
    }
    tickType(dt) {
      const recs = this.typeRecs;
      if (!recs.length) return;
      if (this.opts.typewriter === false) {
        if (!this.typeOff) { this.typeOff = true; recs.forEach(r => { r.k = r.target = r.total; this.writeType(r); r.caret.remove(); }); }
        return;
      }
      this.typeOff = false;
      const mult = Math.max(0.2, Number(this.opts.typeSpeed || 1));
      for (const r of recs) {
        if (r.k === r.target) {
          if (r.caret.parentNode) {
            r.blinkT += dt;
            if (r.blinkT > 950 || r.target === 0) r.caret.remove();
            else r.caret.style.opacity = (Math.floor(r.blinkT / 230) % 2 === 0) ? "1" : "0";
          }
          continue;
        }
        const base = Math.min(0.12, Math.max(0.018, r.total / 900));
        r.k = Math.min(r.target, r.k + base * mult * dt);
        const cn = this.writeType(r);
        r.caret.style.opacity = "1"; r.blinkT = 0;
        if (cn.done.nextSibling !== r.caret) cn.done.parentNode.insertBefore(r.caret, cn.rest);
      }
    }
  }
  window.ArengaEngine = Engine;
  window.dispatchEvent(new Event("arenga-engine"));
})();
