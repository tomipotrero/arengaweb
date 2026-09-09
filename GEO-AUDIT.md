# Auditoría GEO — Arenga
Fecha: 2026-09-09 · Complementa `AEO-AUDIT.md` (respuestas) y la pasada de SEO técnico.

Qué mira esta pasada: si un sistema generativo puede identificar a Arenga sin confundirla,
verificar lo que dice y tener motivos para citarla. No repite lo de SEO (acceso, indexación)
ni lo de AEO (redacción de respuestas).

## Resumen

Hoy Arenga no existe para un motor generativo. El sitio no está publicado, no hay perfiles
oficiales cargados y una búsqueda de "Arenga productora creativa Montevideo" no devuelve
nada de la empresa: devuelve Potrero, que sí tiene sitio y presencia. No es un problema de
optimización, es que todavía no hay entidad pública que optimizar.

La buena noticia: el material de base es sólido y verdadero. Cinco casos con métricas,
21 clientes con sector, 10 personas con nombre y rol, y dos empresas reales detrás
—Potrero y Coach— que pueden confirmar la existencia de Arenga mejor que cualquier táctica.

## 1. Identidad de la entidad — Crítico

**Evidencia.** Búsqueda del 2026-09-09: ningún resultado de Arenga como productora. Potrero
aparece con sitio propio (potrero.com.uy) e Instagram (@potrero.studio); Coach tiene sitio
(coach.uy). Los tres campos de redes de Arenga en el CMS están en "#".

**El riesgo del nombre.** "Arenga" es un sustantivo común en español —un discurso para
levantar el ánimo— y además un género de palmeras. Sin señales de identidad propias, un
sistema que busque "Arenga" va a mezclar la empresa con el sustantivo.

**Hecho en esta pasada.** La ficha de entidad ahora se arma desde `content.json` y viaja en
todas las páginas: nombre, descripción, email, Montevideo (UY), las 6 capacidades como
`knowsAbout`, Potrero y Coach como `parentOrganization` con sus URLs reales, y las 10
personas con su rol. Cada caso publica su propia ficha (obra, cliente, servicios, resultado).
Se completa sola: la URL cuando haya dominio, `sameAs` en cuanto carguen las redes reales.

**Falta (datos del cliente).** Razón social, fecha de fundación, dirección física si reciben
gente, y las URLs de los perfiles oficiales.

## 2. Corroboración externa — Crítico

Es el hueco más grande. No hay una sola fuente independiente que confirme que Arenga existe,
qué hace o para quién trabajó. Un sistema generativo no cita lo que no puede verificar.

Por orden de esfuerzo, todo legítimo:

1. **Que Potrero y Coach enlacen a Arenga desde sus sitios.** Es la corroboración más creíble
   que tienen y no depende de nadie más: dos empresas con presencia propia confirmando la fusión.
2. **Perfiles oficiales** (Instagram, LinkedIn de empresa) con el mismo nombre, la misma
   descripción y el enlace al sitio. Después van al CMS y entran solos en la ficha de entidad.
3. **Créditos en las piezas.** Los cinco casos ya están en Vimeo; que el crédito de producción
   diga Arenga, y pedir lo mismo en las publicaciones de los clientes.
4. **Prensa de negocios y marketing local.** La fusión de Potrero y Coach es una noticia real
   con datos reales. Eso es material de nota, no un favor.
5. **Google Business Profile**, si hay dirección con atención.

Lo que no se hace: menciones compradas, reseñas propias, notas plantadas ni perfiles falsos.

## 3. Autoridad de primera parte — Alto

Lo que ya existe supera a la mayoría de las productoras: casos con números, clientes con
sector, proceso explícito, equipo con nombre y rol.

Lo que falta para ser fuente y no folleto: material original que no se pueda reemplazar con
texto genérico. Tres ideas que salen de lo que ya saben, sin inventar nada:

- **El proceso 01–04, en serio.** Hoy son cuatro títulos con tres líneas. Qué pasa en cada
  etapa, qué se entrega, cuánto dura. Eso es documentación, y la documentación se cita.
- **Un informe anual con método.** Ya tienen +2000 assets, +25% YoY, 1500 árbitros, un sold
  out. Publicarlos juntos, diciendo cómo se midió cada uno, los convierte en dato citable.
- **Qué incluye cada capacidad.** "Social Media" significa cosas distintas en cada agencia;
  decir qué entra y qué no responde una pregunta que la gente hace de verdad.

## 4. Calidad de la evidencia — Alto

Las métricas del sitio no dicen cuándo se midieron ni de dónde salen. Para AEO eso es un
problema de contexto (ya está anotado ahí); para GEO es un problema de verificabilidad: una
cifra sin fecha ni fuente no se cita, se ignora. "+25% YoY según la analítica del cliente,
enero 2024 a diciembre 2025" es una afirmación citable. "+25% YoY" es una promesa.

## 5. Ajuste a lo que se pregunta — Medio

Las consultas reales del rubro: "productora de contenido en Montevideo", "agencia de social
media en Uruguay", "agencias que trabajan con influencers", "quién hizo la campaña de butacas
de Nacional". La última la responde bien el caso de Nacional. Las otras se responden a medias,
porque no hay una página por servicio con mercado, alcance y casos.

Recomendación: una página para las capacidades fuertes (Social Media, Producción audiovisual,
Influencers), sólo si hay casos y alcance real para cada una. Tres páginas buenas, no seis
por completar la grilla.

## 6. Medición — Medio

Antes de publicar:
- Search Console y Bing Webmaster Tools (Bing alimenta a Copilot).
- Analítica que separe el tráfico que llega desde ChatGPT, Perplexity y Gemini.

Después, una vez por mes: preguntarle a los asistentes "¿qué es Arenga?", "¿quién hizo la
campaña de butacas de Nacional?", "¿qué agencias de contenido hay en Montevideo?" y anotar
qué responden y a quién citan. Es rudimentario, pero es la única evidencia directa que existe
hoy. Los "scores de visibilidad AI" de terceros son orientativos, nada más.

## Plan sugerido

**Primeros 30 días** — dominio y publicación; perfiles oficiales cargados en el CMS; enlaces
desde Potrero y Coach; Search Console y Bing dados de alta.

**60 días** — fecha y fuente en cada métrica; créditos de producción en Vimeo y en las piezas
de los clientes; páginas por capacidad si hay material.

**90 días** — una pieza original propia (el informe con método o la documentación del
proceso) y la primera medición de citas.

## Dependencias

- **SEO**: sitemap.xml y og:image absoluta, pendientes del dominio. Resto resuelto.
- **AEO**: fechas junto a las métricas y un párrafo de proceso propio por caso
  (hallazgos 1 y 2 de `AEO-AUDIT.md`).

## Datos que necesito

Razón social, fecha de fundación, dirección (si corresponde), URLs de Instagram y LinkedIn,
y confirmación de que Potrero y Coach pueden enlazar a Arenga.
