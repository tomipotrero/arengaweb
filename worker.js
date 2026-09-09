/* El sitio se sirve como Worker con assets estáticos. Los assets se resuelven
   antes que este script; sólo llega acá lo que no es un archivo: /api/contact.

   El mail sale por Cloudflare Email (binding send_email en wrangler.jsonc).
   Sin binding configurado el formulario avisa en pantalla en lugar de fallar mudo. */

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type"
};
const json = (o, status) => new Response(JSON.stringify(o), {
  status: status || 200,
  headers: Object.assign({ "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }, CORS)
});

const clean = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);
const okMail = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v);

// cabecera de asunto con acentos: RFC 2047
const enc = (s) => /^[\x20-\x7e]*$/.test(s) ? s
  : "=?UTF-8?B?" + btoa(String.fromCharCode.apply(null, new TextEncoder().encode(s))) + "?=";

function mime(from, to, subject, replyTo, text) {
  const id = "<" + Date.now() + "." + Math.random().toString(36).slice(2) + "@arenga.uy>";
  return [
    "From: Arenga web <" + from + ">",
    "To: <" + to + ">",
    replyTo ? "Reply-To: <" + replyTo + ">" : null,
    "Message-ID: " + id,
    "Date: " + new Date().toUTCString(),
    "Subject: " + enc(subject),
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="utf-8"',
    "Content-Transfer-Encoding: base64",
    "",
    btoa(String.fromCharCode.apply(null, new TextEncoder().encode(text))).replace(/(.{76})/g, "$1\r\n")
  ].filter(Boolean).join("\r\n");
}

async function contact(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  let d;
  try { d = await request.json(); } catch (e) { return json({ ok: false, error: "bad_request" }, 400); }

  if (clean(d.website, 40)) return json({ ok: true }); // campo trampa: bot

  const name = clean(d.name, 120), email = clean(d.email, 160);
  const company = clean(d.company, 160), message = clean(d.message, 4000);
  if (!message) return json({ ok: false, error: "empty" }, 422);
  if (!okMail(email)) return json({ ok: false, error: "email" }, 422);

  const to = env.CONTACT_TO || "hola@arenga.uy";
  const from = env.CONTACT_FROM || "web@arenga.uy";
  const subject = "Contacto web — " + (company || name || email);
  const text = [
    message, "", "—",
    name ? "Nombre: " + name : null,
    company ? "Marca o empresa: " + company : null,
    "Email: " + email,
    "Página: " + clean(d.page, 200),
    "Enviado: " + new Date().toISOString()
  ].filter(Boolean).join("\n");

  if (env.EMAIL) {
    try {
      if (typeof env.EMAIL.send === "function") {
        await env.EMAIL.send({ to: to, from: from, replyTo: email, subject: subject, text: text });
      } else {
        const { EmailMessage } = await import("cloudflare:email");
        await env.EMAIL.send(new EmailMessage(from, to, mime(from, to, subject, email, text)));
      }
      return json({ ok: true });
    } catch (e) {
      return json({ ok: false, error: "send_failed", detail: String(e && e.message || e).slice(0, 300) }, 502);
    }
  }

  // alternativa por API si algún día se prefiere un proveedor externo
  if (env.RESEND_API_KEY) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({ from: "Arenga web <" + from + ">", to: [to], reply_to: email, subject: subject, text: text })
    });
    if (!r.ok) return json({ ok: false, error: "send_failed", detail: (await r.text()).slice(0, 300) }, 502);
    return json({ ok: true });
  }

  return json({ ok: false, error: "not_configured" }, 503);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/contact") return contact(request, env);
    return env.ASSETS.fetch(request);
  }
};
