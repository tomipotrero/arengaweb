/* Campo de partículas del hero, dibujado por la placa de video.
 *
 * La versión anterior corría en el procesador: cada cuadro construía miles de
 * trazos y repintaba el lienzo entero. Acá el procesador no toca ni una
 * partícula. La posición de cada una es una función de su semilla y del
 * tiempo, evaluada en el sombreador de vértices, así que por cuadro se manda
 * un puñado de valores y una sola orden de dibujo. El costo no crece con la
 * cantidad de partículas.
 *
 * window.ArengaGL.start(canvas, opts) -> handle | null   (null = sin WebGL)
 *   handle.setProgress(p)            0..1, avance del capítulo: sube y apaga
 *   handle.setPointer(x, y, on)      en px del lienzo
 *   handle.resize()
 *   handle.destroy()
 */
(function () {
  "use strict";

  var VERT = [
    "attribute float a_i;",
    "attribute float a_end;",
    "attribute vec4  a_s1;",
    "attribute vec4  a_s2;",
    "attribute vec2  a_tgt;",
    "uniform float u_time;",
    "uniform vec2  u_res;",
    "uniform vec2  u_mouse;",
    "uniform float u_mouseOn;",
    "uniform float u_prog;",
    "uniform float u_amp;",
    "uniform float u_in;",
    "uniform vec2  u_wave;",
    "uniform float u_waveT;",
    "uniform vec2  u_par;",
    "uniform float u_form;",
    "uniform float u_rel;",
    "uniform float u_gain;",
    "uniform vec4  u_box;",
    "varying float v_a;",
    "varying vec3  v_c;",
    /* Las semillas llegan como dato, no se calculan con sin() en el sombreador:
       el hash clásico depende de la precisión de coma flotante de cada placa y
       en las más modestas degenera en patrones. Así el campo se ve igual en
       todas, y de paso el sombreador hace menos cuentas. */
    // campo de flujo analítico: tres octavas, sin estado y sin costuras
    "vec2 flow(vec2 b, float t, float ph, float sc) {",
    "  float u = sin(b.y * 5.5 + t * 0.55 + ph) + 0.55 * cos(b.x * 9.0 - t * 0.42 + ph) + 0.26 * sin(b.y * 17.0 - t * 0.9 + ph * 1.7);",
    "  float v = cos(b.x * 5.5 - t * 0.48 + ph) + 0.55 * sin(b.y * 9.0 + t * 0.36 + ph) + 0.26 * cos(b.x * 17.0 + t * 0.8 + ph * 1.3);",
    "  return b + vec2(u, v) * u_amp * sc;",
    "}",
    "void main() {",
    "  vec2 base = a_s1.xy;",
    "  float ph = a_s1.z;",
    "  float z = a_s1.w;",
    "  float k = a_s2.x;",
    "  float off = a_s2.y;",
    "  vec2 fdir = a_s2.zw;",
    // profundidad: las cercanas van más rápido, más largas y más brillantes
    "  float sc = mix(0.5, 1.15, z);",
    "  vec2 p0 = flow(base, u_time * sc, ph, sc);",
    "  vec2 p1 = flow(base, u_time * sc + 0.16, ph, sc);",
    "  vec2 P = p0 * u_res;",
    "  vec2 V = (p1 - p0) * u_res;",
    "  float boost = 0.0;",
    // parallaje: cada capa de profundidad se corre distinto con el cursor
    "  P += u_par * mix(5.0, 32.0, z);",
    "  if (u_mouseOn > 0.5) {",
    "    vec2 d = P - u_mouse;",
    "    float r = min(u_res.x, u_res.y) * 0.36;",
    "    float dd = length(d) + 0.001;",
    "    float f = max(0.0, 1.0 - dd / r); f = f * f;",
    "    vec2 dir = d / dd;",
    "    vec2 sw = vec2(-dir.y, dir.x);",
    "    P += (dir * 0.5 + sw * 0.42) * f * r * 0.5;",
    "    V += (dir * 0.3 + sw * 0.9) * f * 46.0;",
    "    boost = f;",
    "  }",
    // onda del clic: un anillo que se expande y empuja al pasar
    "  if (u_waveT >= 0.0) {",
    "    vec2 d = P - u_wave;",
    "    float dd = length(d) + 0.001;",
    "    float rad = u_waveT * min(u_res.x, u_res.y) * 0.9;",
    "    float band = abs(dd - rad);",
    "    float f = exp(-(band * band) / 5200.0) * max(0.0, 1.0 - u_waveT * 0.7);",
    "    P += (d / dd) * f * 105.0;",
    "    boost += f * 0.85;",
    "  }",
    // el capítulo se va hacia arriba y converge al centro
    "  P.y -= u_prog * u_prog * u_res.y * 1.05;",
    "  P.x += (u_res.x * 0.5 - P.x) * u_prog * 0.32;",
    /* Logotipo. Los destinos vienen en a_tgt, calculados una sola vez al cargar
       y subidos como dato fijo: la placa sólo interpola entre el flujo y su
       punto. Se desarma desde los costados hacia el centro, no todo junto. */
    "  float form = 0.0;",
    "  float isLogo = a_tgt.x < 2.0 ? 1.0 : 0.0;",
    "  float spacing = 1.0;",
    "  if (a_tgt.x < 2.0) {",
    "    float edge = min(1.0, abs(a_tgt.x));",
    // llegada: cada partícula entra en su momento, repartido al azar, así el
    // dibujo se condensa de a poco en vez de aparecer de golpe
    "    float arr = clamp((u_form - off) / max(0.2, 1.0 - off), 0.0, 1.0);",
    "    arr = arr * arr * arr * (arr * (arr * 6.0 - 15.0) + 10.0);",
    // salida: desde los costados hacia el centro
    "    float rel = clamp((u_rel - (1.0 - edge) * 0.52) / 0.48, 0.0, 1.0);",
    "    rel = rel * rel * rel * (rel * (rel * 6.0 - 15.0) + 10.0);",
    "    form = arr * (1.0 - rel) * step(2.0, u_box.z);",
    "    float bw = min(u_res.x * 0.8, min(1500.0, u_box.z));",
    // los destinos vienen de una rejilla cuyo ancho manda el módulo: al escalar
    // quedan separados, y el trazo tiene que medir esa separación para cerrar
    "    spacing = bw / max(16.0, u_box.w);",
    "    vec2 T = vec2(u_res.x * 0.5, u_box.x) + a_tgt * bw * 0.5;",
    "    T += vec2(sin(u_time * 2.1 + ph), cos(u_time * 1.7 + ph)) * mix(1.3, 0.3, form);",
    "    P = mix(P, T, form);",
    "  }",
    // entrada: el campo se condensa desde abajo, cada partícula a su turno
    "  float en = clamp((u_in - off * 0.7) / 0.58, 0.0, 1.0);",
    "  en = en * en * (3.0 - 2.0 * en);",
    "  P.y += (1.0 - en) * u_res.y * mix(0.5, 1.2, z);",
    // la estela va DETRÁS y se apaga hacia la cola: así se lee como movimiento
    "  float sp = length(V);",
    "  float len = (1.8 + sp * 0.42 + boost * 7.0 + u_prog * 7.0) * mix(0.55, 1.35, z);",
    "  len = mix(len, spacing * 1.75, form);",
    "  vec2 dv = normalize(V + vec2(0.0001, 0.0001));",
    "  dv = mix(dv, fdir, form);",
    "  vec2 Q = P - dv * len * a_end;",
    "  vec2 clip = (Q / u_res) * 2.0 - 1.0;",
    "  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);",
    "  vec3 c = mix(vec3(0.157, 0.918, 0.608), vec3(0.302, 0.882, 0.769), k);",
    "  c = mix(c, vec3(0.553, 0.941, 0.478), a_s2.y * 0.55);",
    "  if (k > 0.955) c = vec3(1.0, 0.341, 0.082);",
    "  if (k < 0.055) c = vec3(0.949, 0.937, 0.914);",
    "  v_c = c;",
    // sin corte en los bordes del lienzo, y cola transparente
    "  vec2 e = P / u_res;",
    "  float edge = smoothstep(0.0, 0.1, e.x) * smoothstep(1.0, 0.9, e.x) * smoothstep(0.0, 0.1, e.y) * smoothstep(1.0, 0.88, e.y);",
    "  float tail = mix(1.0, 0.06, a_end);",
    // las partículas sueltas se apagan cuando el logotipo toma la pantalla
    "  v_a = (0.13 + boost * 0.55 + form * 1.15) * mix(mix(0.35, 1.25, z), 1.0, form) * mix(1.0 - u_form * 0.88, 1.0, isLogo) * u_gain * edge * tail * en * (1.0 - u_prog * 0.8);",
    "}"
  ].join("\n");

  var FRAG = [
    "precision mediump float;",
    "varying float v_a;",
    "varying vec3  v_c;",
    "void main() { gl_FragColor = vec4(v_c * v_a, v_a); }"
  ].join("\n");

  /* Estado del diagnóstico, en el ámbito del módulo. Antes vivía en
     window.ArengaGL.diag, y como el objeto se reasigna cada vez que el módulo
     se evalúa, why() leía un objeto viejo y respondía que nunca había
     arrancado. Ahora start() muta este mismo objeto y why() lo lee del cierre. */
  var diag = { motor: "webgl", arrancado: false, poblacion: 0, cuadroMs: 0, abandono: false, motivo: "" };

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      if (window.console) console.warn("ArengaGL shader:", gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function start(canvas, opts) {
    opts = opts || {};
    if (!canvas || !window.WebGLRenderingContext) return null;
    var gl = null;
    try {
      var attrs = { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, powerPreference: "low-power" };
      gl = canvas.getContext("webgl", attrs) || canvas.getContext("experimental-webgl", attrs);
    } catch (e) { gl = null; }
    if (!gl) return null;

    var vs = compile(gl, gl.VERTEX_SHADER, VERT);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    var coarse = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    var n = Math.max(2000, Math.min(opts.count || (coarse ? 11000 : 26000), 60000));
    var ae = new Float32Array(n * 2);
    // semillas: posición base, fase, profundidad, tono, turno y dirección propia
    var s1 = new Float32Array(n * 8), s2 = new Float32Array(n * 8);
    for (var i = 0; i < n; i++) {
      var bx = Math.random(), by = Math.random();
      // se agrupan en filamentos ondulados: un campo parejo se lee como ruido
      var band = 0.5 + 0.42 * Math.sin(bx * 4 + Math.random() * 2.2);
      by = by + (band - by) * 0.34;
      var ph = Math.random() * 6.2831, z = Math.random();
      var k = Math.random(), off = Math.random() * 0.6;
      var a = Math.random() * 6.2831;
      var fx = Math.cos(a), fy = Math.sin(a);
      for (var e = 0; e < 2; e++) {
        var o = (i * 2 + e) * 4;
        s1[o] = bx; s1[o + 1] = by; s1[o + 2] = ph; s1[o + 3] = z;
        s2[o] = k; s2[o + 1] = off; s2[o + 2] = fx; s2[o + 3] = fy;
        ae[i * 2 + e] = e;
      }
    }
    function buf(data, loc, size) {
      var b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      var l = gl.getAttribLocation(prog, loc);
      if (l < 0) return b;
      gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, size || 1, gl.FLOAT, false, 0, 0);
      return b;
    }
    buf(ae, "a_end"); buf(s1, "a_s1", 4); buf(s2, "a_s2", 4);
    // destinos del logotipo; 9 = esta partícula no forma parte de él
    var at = new Float32Array(n * 4);
    for (var j = 0; j < n * 2; j++) { at[j * 2] = 9; at[j * 2 + 1] = 9; }
    var atBuf = buf(at, "a_tgt", 2);

    var U = {};
    ["u_time", "u_res", "u_mouse", "u_mouseOn", "u_prog", "u_amp", "u_in", "u_wave", "u_waveT", "u_par", "u_form", "u_rel", "u_gain", "u_box"].forEach(function (k) {
      U[k] = gl.getUniformLocation(prog, k);
    });

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.clearColor(0, 0, 0, 0);

    var st = { w: 0, h: 0, dpr: 1, prog: 0, mx: -1e4, my: -1e4, on: 0, amp: opts.amp || 0.085, auto: opts.auto || 0, raf: 0, dead: false, t0: performance.now() };
    // entrada, onda del clic y paralaje: tres uniformes, ningún costo por cuadro
    var inT = 0, waveT = 0, wx = 0, wy = 0, lastAuto = 0;
    var parX = 0, parY = 0, parTX = 0, parTY = 0, form = 0, rel = 0, formT2 = 0, relT2 = 0;
    // caja del logotipo: centro vertical y ancho máximo, en px. La fija la
    // página, que es la única que sabe dónde terminan la copia y el enlace.
    var boxY = 0, boxW = 0, boxAR = 0.15, sampW = 520;
    /* Regulador. WebGL no garantiza aceleración: si no hay placa disponible el
       navegador lo emula en el procesador y sale peor que el lienzo. Por eso se
       arranca con una fracción de la población y se sube sólo si hay margen
       real, en vez de empezar al máximo y bajar. Si ni la fracción mínima
       entra, se abandona y la página se queda con el fondo de masas de color. */
    var floor = Math.max(1200, Math.round(n * 0.1));
    var drawn = Math.min(n, Math.max(floor, Math.round(n * 0.22)));
    var ms = 0, chk = 0, last = 0, gaveUp = false, warm = false;
    diag.arrancado = true; diag.abandono = false; diag.motivo = ""; diag.poblacion = drawn; diag.cuadroMs = 0;

    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!(w > 0 && h > 0)) return;
      var dpr = Math.min(opts.dpr || 1.5, window.devicePixelRatio || 1);
      if (st.w === w && st.h === h && st.dpr === dpr) return;
      st.w = w; st.h = h; st.dpr = dpr;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();

    var visible = true;
    var io = null;
    if (window.IntersectionObserver) {
      io = new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { rootMargin: "80px" });
      io.observe(canvas);
    }

    function frame(now) {
      if (st.dead) return;
      st.raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) { last = 0; return; }
      resize();
      if (!st.w) return;
      /* Periodo de gracia. El regulador medía desde el primer cuadro, y durante
         la carga la página está ocupada hidratando, montando 59 fotos y
         resolviendo fuentes: esos cuadros pasan de 45 ms sin que la máquina
         tenga nada de malo. Medía eso y abandonaba para siempre. Ahora no se
         juzga hasta que el arranque terminó, y el promedio se reinicia ahí. */
      if (now - st.t0 < 2600) { last = now; return; }
      if (!warm) { warm = true; ms = 0; last = now; chk = 0; return; }
      if (last) {
        var d = now - last;
        if (d < 400) ms = ms ? ms * 0.88 + d * 0.12 : d;
      }
      last = now;
      if (++chk > 14) {
        chk = 0;
        if (ms > 45 && !gaveUp) {
          // claramente sin aceleración: no vale la pena insistir
          gaveUp = true; st.dead = true;
          diag.abandono = true; diag.motivo = "cuadro de " + Math.round(ms) + " ms tras el arranque: sin aceleración por hardware";
          cancelAnimationFrame(st.raf);
          if (io) io.disconnect();
          if (opts.onFallback) opts.onFallback();
          return;
        }
        if (ms > 23) {
          if (drawn > floor) { drawn = Math.max(floor, Math.round(drawn * 0.6)); ms = 16.7; }
          else if (!gaveUp) {
            gaveUp = true; st.dead = true;
            diag.abandono = true; diag.motivo = "ni con la población mínima baja de " + Math.round(ms) + " ms por cuadro";
            cancelAnimationFrame(st.raf);
            if (io) io.disconnect();
            if (opts.onFallback) opts.onFallback();
            return;
          }
        } else if (ms > 0 && ms < 14.5 && drawn < n) drawn = Math.min(n, Math.round(drawn * 1.3) + 600);
        diag.poblacion = drawn; diag.cuadroMs = Math.round(ms);
      }
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(U.u_time, (now - st.t0) * 0.00042);
      gl.uniform2f(U.u_res, st.w, st.h);
      gl.uniform2f(U.u_mouse, st.mx, st.my);
      gl.uniform1f(U.u_mouseOn, st.on);
      gl.uniform1f(U.u_prog, st.prog);
      gl.uniform1f(U.u_amp, st.amp);
      // si nadie llamó a enter() en dos segundos y medio, entra igual: el campo
      // invisible esperando una señal que no llega sería peor que entrar solo
      if (!inT && now - st.t0 > 2500) inT = now;
      /* Ondas solas. Sólo cuando el campo está libre: durante el logotipo las
         partículas están fijas en su punto y un empujón lo desdibujaría. */
      if (st.auto && !waveT && form < 0.05 && inT && now - inT > 1200 && now - lastAuto > st.auto) {
        lastAuto = now;
        wx = st.w * (0.18 + Math.random() * 0.64);
        wy = st.h * (0.2 + Math.random() * 0.6);
        waveT = now;
      }
      var uin = inT ? Math.min(1, (now - inT) / 1500) : 0;
      gl.uniform1f(U.u_in, uin);
      parX += (parTX - parX) * 0.07; parY += (parTY - parY) * 0.07;
      gl.uniform2f(U.u_par, parX, parY);
      var wt = -1;
      if (waveT) {
        wt = (now - waveT) / 1000;
        if (wt > 1.5) { waveT = 0; wt = -1; }
      }
      gl.uniform2f(U.u_wave, wx, wy);
      gl.uniform1f(U.u_waveT, wt);
      // se persigue el objetivo en vez de saltar a él: scrollear rápido no
      // arma ni desarma el logotipo de golpe
      /* Se persigue el objetivo, pero a velocidad variable: si la diferencia es
         grande —un scroll de golpe— alcanza rápido, y cuando ya está cerca
         vuelve al ritmo lento. Con una sola constante lenta, scrollear rápido
         dejaba el logotipo a medio armar; con una sola rápida, el scroll normal
         se veía brusco. */
      var gap = Math.abs(formT2 - form);
      form += (formT2 - form) * (gap > 0.4 ? 0.22 : 0.055);
      var gapR = Math.abs(relT2 - rel);
      rel += (relT2 - rel) * (gapR > 0.4 ? 0.22 : 0.055);
      gl.uniform1f(U.u_form, form);
      gl.uniform1f(U.u_rel, rel);
      // el trazo mide siempre un píxel de placa: a más resolución es más fino
      // en píxeles de página, y hay que devolverle el brillo que pierde
      gl.uniform1f(U.u_gain, st.dpr);
      gl.uniform4f(U.u_box, boxY || st.h * 0.5, boxAR, boxW, sampW);
      gl.drawArrays(gl.LINES, 0, drawn * 2);
    }
    st.raf = requestAnimationFrame(frame);

    return {
      count: n,
      setProgress: function (p) { st.prog = p < 0 ? 0 : (p > 1 ? 1 : p); },
      setPointer: function (x, y, on) {
        st.mx = x; st.my = y; st.on = on ? 1 : 0;
        if (on && st.w) { parTX = (x / st.w - 0.5) * 2; parTY = (y / st.h - 0.5) * 2; }
        else { parTX = 0; parTY = 0; }
      },
      enter: function () { if (!inT) inT = performance.now(); },
      setForm: function (f) { formT2 = f < 0 ? 0 : (f > 1 ? 1 : f); },
      setRelease: function (f) { relT2 = f < 0 ? 0 : (f > 1 ? 1 : f); },
      /* La página manda la banda libre: centro vertical y alto disponible. El
         ancho se deriva del alto por la proporción real del dibujo, así el
         logotipo no puede cruzarse con la copia ni con el enlace. */
      setLogoBox: function (centerY, availH) {
        boxY = centerY;
        // 0 = no hay banda libre: el sombreador deja el logotipo sin formar
        boxW = availH <= 0 ? 0 : (boxAR > 0 ? (availH / boxAR) : availH * 6);
      },
      /* Rasteriza el SVG una sola vez, muestrea los píxeles opacos y sube los
         destinos como dato fijo. A partir de ahí el logotipo no cuesta nada:
         es una interpolación más dentro del sombreador. */
      setLogo: function (svg, frac) {
        if (!svg) return;
        var img = new Image();
        img.onload = function () {
          if (st.dead) return;
          var want = Math.round(n * (frac || 0.42));
          var AR = img.height / img.width;
          /* Dos pases. El primero, chico, sólo mide cuánta tinta tiene el
             dibujo; con eso se elige la rejilla final para que la cantidad de
             celdas con tinta sea ~la de partículas disponibles. Con rejilla
             fija, un isotipo cuadrado generaba cuatro veces más puntos que
             partículas y el dibujo quedaba cubierto a un cuarto. */
          var oc = document.createElement("canvas");
          var g2;
          var pw = 110, phh = Math.max(2, Math.round(110 * AR));
          oc.width = pw; oc.height = phh;
          g2 = oc.getContext("2d");
          g2.drawImage(img, 0, 0, pw, phh);
          var dp = g2.getImageData(0, 0, pw, phh).data, ink = 0;
          for (var i2 = 3; i2 < dp.length; i2 += 4) if (dp[i2] > 120) ink++;
          var inkFrac = Math.max(0.02, ink / (pw * phh));
          var W = Math.max(64, Math.min(1500, Math.round(Math.sqrt(want / (inkFrac * AR)))));
          var H = Math.max(2, Math.round(W * AR));
          oc.width = W; oc.height = H;
          g2 = oc.getContext("2d");
          g2.drawImage(img, 0, 0, W, H);
          var d = g2.getImageData(0, 0, W, H).data;
          var pts = [];
          for (var yy = 0; yy < H; yy += 1) {
            for (var xx = 0; xx < W; xx += 1) {
              if (d[(yy * W + xx) * 4 + 3] > 120) pts.push((xx / W - 0.5) * 2, ((yy / H - 0.5) * 2) * AR);
            }
          }
          if (!pts.length) return;
          boxAR = AR; sampW = W;
          var m = pts.length / 2;
          for (var k2 = 0; k2 < want; k2++) {
            var s = ((k2 * 2654435761) % m + m) % m;
            var tx = pts[s * 2], ty = pts[s * 2 + 1];
            at[k2 * 4] = tx; at[k2 * 4 + 1] = ty;
            at[k2 * 4 + 2] = tx; at[k2 * 4 + 3] = ty;
          }
          gl.bindBuffer(gl.ARRAY_BUFFER, atBuf);
          gl.bufferData(gl.ARRAY_BUFFER, at, gl.STATIC_DRAW);
        };
        img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
      },
      pulse: function (x, y) { wx = x; wy = y; waveT = performance.now(); lastAuto = performance.now(); },
      setAuto: function (ms) { st.auto = ms > 0 ? ms : 0; },
      resize: resize,
      destroy: function () {
        st.dead = true;
        if (st.raf) cancelAnimationFrame(st.raf);
        if (io) io.disconnect();
        var lose = gl.getExtension("WEBGL_lose_context");
        if (lose) lose.loseContext();
      }
    };
  }

  window.ArengaGL = {
    start: start,
    /* En la consola de la máquina afectada: ArengaGL.why()
       Dice cuál de las cinco puertas cerró el campo de partículas. */
    why: function () {
      var d = diag;
      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) return "El sistema pide menos movimiento (Reducir movimiento en macOS / Mostrar animaciones en Windows). El campo no arranca a propósito.";
      var cv = document.querySelector("[data-gl]");
      if (!cv) return "No hay lienzo en la página.";
      if (!window.WebGLRenderingContext) return "El navegador no soporta WebGL.";
      var ok = false;
      try { ok = !!(cv.getContext("webgl") || cv.getContext("experimental-webgl")); } catch (e) {}
      if (!ok) return "El navegador no pudo crear un contexto WebGL: aceleración por hardware desactivada, o la placa está en la lista de bloqueo.";
      if (!d.arrancado) return "El módulo no llegó a arrancar (¿arenga-gl.js no cargó?).";
      if (d.abandono) return "Arrancó y se abandonó: " + d.motivo;
      return "Andando. Población " + d.poblacion + " partículas, " + d.cuadroMs + " ms por cuadro.";
    }
  };
})();
