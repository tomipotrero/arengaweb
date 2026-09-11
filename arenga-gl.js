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
    "uniform float u_time;",
    "uniform vec2  u_res;",
    "uniform vec2  u_mouse;",
    "uniform float u_mouseOn;",
    "uniform float u_prog;",
    "uniform float u_amp;",
    "varying float v_a;",
    "varying vec3  v_c;",
    "float hash(float n) { return fract(sin(n) * 43758.5453123); }",
    // campo de flujo analítico: tres octavas, sin estado y sin costuras
    "vec2 flow(vec2 b, float t, float ph, float sc) {",
    "  float u = sin(b.y * 5.5 + t * 0.55 + ph) + 0.55 * cos(b.x * 9.0 - t * 0.42 + ph) + 0.26 * sin(b.y * 17.0 - t * 0.9 + ph * 1.7);",
    "  float v = cos(b.x * 5.5 - t * 0.48 + ph) + 0.55 * sin(b.y * 9.0 + t * 0.36 + ph) + 0.26 * cos(b.x * 17.0 + t * 0.8 + ph * 1.3);",
    "  return b + vec2(u, v) * u_amp * sc;",
    "}",
    "void main() {",
    "  vec2 base = vec2(hash(a_i * 1.7), hash(a_i * 3.3 + 11.0));",
    // se agrupan en filamentos ondulados: un campo parejo se lee como ruido
    "  base.y = mix(base.y, 0.5 + 0.42 * sin(base.x * 4.0 + hash(a_i * 11.0) * 2.2), 0.34);",
    "  float ph = hash(a_i * 5.1) * 6.2831;",
    // profundidad: las cercanas van más rápido, más largas y más brillantes
    "  float z = hash(a_i * 2.1);",
    "  float sc = mix(0.5, 1.15, z);",
    "  vec2 p0 = flow(base, u_time * sc, ph, sc);",
    "  vec2 p1 = flow(base, u_time * sc + 0.16, ph, sc);",
    "  vec2 P = p0 * u_res;",
    "  vec2 V = (p1 - p0) * u_res;",
    "  float boost = 0.0;",
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
    // el capítulo se va hacia arriba y converge al centro
    "  P.y -= u_prog * u_prog * u_res.y * 1.05;",
    "  P.x += (u_res.x * 0.5 - P.x) * u_prog * 0.32;",
    // la estela va DETRÁS y se apaga hacia la cola: así se lee como movimiento
    "  float sp = length(V);",
    "  float len = (1.8 + sp * 0.42 + boost * 7.0 + u_prog * 7.0) * mix(0.55, 1.35, z);",
    "  vec2 dv = normalize(V + vec2(0.0001, 0.0001));",
    "  vec2 Q = P - dv * len * a_end;",
    "  vec2 clip = (Q / u_res) * 2.0 - 1.0;",
    "  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);",
    "  float k = hash(a_i * 7.7);",
    "  vec3 c = mix(vec3(0.157, 0.918, 0.608), vec3(0.302, 0.882, 0.769), k);",
    "  c = mix(c, vec3(0.553, 0.941, 0.478), hash(a_i * 9.3) * 0.55);",
    "  if (k > 0.955) c = vec3(1.0, 0.341, 0.082);",
    "  if (k < 0.055) c = vec3(0.949, 0.937, 0.914);",
    "  v_c = c;",
    // sin corte en los bordes del lienzo, y cola transparente
    "  vec2 e = P / u_res;",
    "  float edge = smoothstep(0.0, 0.1, e.x) * smoothstep(1.0, 0.9, e.x) * smoothstep(0.0, 0.1, e.y) * smoothstep(1.0, 0.88, e.y);",
    "  float tail = mix(1.0, 0.06, a_end);",
    "  v_a = (0.13 + boost * 0.55) * mix(0.35, 1.25, z) * edge * tail * (1.0 - u_prog * 0.8);",
    "}"
  ].join("\n");

  var FRAG = [
    "precision mediump float;",
    "varying float v_a;",
    "varying vec3  v_c;",
    "void main() { gl_FragColor = vec4(v_c * v_a, v_a); }"
  ].join("\n");

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
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
    var ai = new Float32Array(n * 2), ae = new Float32Array(n * 2);
    for (var i = 0; i < n; i++) {
      ai[i * 2] = i + 1; ai[i * 2 + 1] = i + 1;
      ae[i * 2] = 0; ae[i * 2 + 1] = 1;
    }
    function buf(data, loc) {
      var b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      var l = gl.getAttribLocation(prog, loc);
      gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, 1, gl.FLOAT, false, 0, 0);
      return b;
    }
    buf(ai, "a_i"); buf(ae, "a_end");

    var U = {};
    ["u_time", "u_res", "u_mouse", "u_mouseOn", "u_prog", "u_amp"].forEach(function (k) {
      U[k] = gl.getUniformLocation(prog, k);
    });

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.clearColor(0, 0, 0, 0);

    var st = { w: 0, h: 0, dpr: 1, prog: 0, mx: -1e4, my: -1e4, on: 0, amp: opts.amp || 0.085, raf: 0, dead: false, t0: performance.now() };
    /* Regulador. WebGL no garantiza aceleración: si no hay placa disponible el
       navegador lo emula en el procesador y sale peor que el lienzo. Por eso se
       arranca con una fracción de la población y se sube sólo si hay margen
       real, en vez de empezar al máximo y bajar. Si ni la fracción mínima
       entra, se abandona y la página se queda con el fondo de masas de color. */
    var floor = Math.max(1200, Math.round(n * 0.1));
    var drawn = Math.min(n, Math.max(floor, Math.round(n * 0.22)));
    var ms = 0, chk = 0, last = 0, gaveUp = false;

    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!(w > 0 && h > 0)) return;
      var dpr = Math.min(opts.dpr || 1, window.devicePixelRatio || 1);
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
          cancelAnimationFrame(st.raf);
          if (io) io.disconnect();
          if (opts.onFallback) opts.onFallback();
          return;
        }
        if (ms > 23) {
          if (drawn > floor) { drawn = Math.max(floor, Math.round(drawn * 0.6)); ms = 16.7; }
          else if (!gaveUp) {
            gaveUp = true; st.dead = true;
            cancelAnimationFrame(st.raf);
            if (io) io.disconnect();
            if (opts.onFallback) opts.onFallback();
            return;
          }
        } else if (ms > 0 && ms < 14.5 && drawn < n) drawn = Math.min(n, Math.round(drawn * 1.3) + 600);
      }
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(U.u_time, (now - st.t0) * 0.00042);
      gl.uniform2f(U.u_res, st.w, st.h);
      gl.uniform2f(U.u_mouse, st.mx, st.my);
      gl.uniform1f(U.u_mouseOn, st.on);
      gl.uniform1f(U.u_prog, st.prog);
      gl.uniform1f(U.u_amp, st.amp);
      gl.drawArrays(gl.LINES, 0, drawn * 2);
    }
    st.raf = requestAnimationFrame(frame);

    return {
      count: n,
      setProgress: function (p) { st.prog = p < 0 ? 0 : (p > 1 ? 1 : p); },
      setPointer: function (x, y, on) { st.mx = x; st.my = y; st.on = on ? 1 : 0; },
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

  window.ArengaGL = { start: start };
})();
