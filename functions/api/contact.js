/* Recibe el formulario de contacto y manda el mail. Corre en Cloudflare Pages
   (el equivalente al PHP de un hosting clásico: mismo repositorio, sin servidor).

   Variables de entorno del proyecto de Pages:
     RESEND_API_KEY  (obligatoria)  clave de https://resend.com
     CONTACT_TO      (opcional)     destinatario · por defecto hola@arenga.uy
     CONTACT_FROM    (opcional)     remitente verificado en Resend
*/

const json = (o, status) => new Response(JSON.stringify(o), {
  status: status || 200,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

const clean = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);
const okMail = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v);

export async function onRequestPost({ request, env }) {
  let d;
  try { d = await request.json(); } catch (e) { return json({ ok: false, error: "bad_request" }, 400); }

  // trampa para bots: campo oculto que una persona nunca completa
  if (clean(d.website, 40)) return json({ ok: true });

  const name = clean(d.name, 120);
  const email = clean(d.email, 160);
  const company = clean(d.company, 160);
  const message = clean(d.message, 4000);

  if (!message) return json({ ok: false, error: "empty" }, 422);
  if (!okMail(email)) return json({ ok: false, error: "email" }, 422);
  if (!env.RESEND_API_KEY) return json({ ok: false, error: "not_configured" }, 503);

  const to = env.CONTACT_TO || "hola@arenga.uy";
  const from = env.CONTACT_FROM || "Arenga web <onboarding@resend.dev>";
  const subject = "Contacto web — " + (company || name || email);
  const text = [
    message, "",
    "—",
    name ? "Nombre: " + name : null,
    company ? "Marca o empresa: " + company : null,
    "Email: " + email,
    "Página: " + clean(d.page, 200),
    "Enviado: " + new Date().toISOString()
  ].filter(Boolean).join("\n");

  let r;
  try {
    r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({ from: from, to: [to], reply_to: email, subject: subject, text: text })
    });
  } catch (e) {
    return json({ ok: false, error: "network" }, 502);
  }
  if (!r.ok) return json({ ok: false, error: "send_failed", detail: (await r.text()).slice(0, 300) }, 502);
  return json({ ok: true });
}
