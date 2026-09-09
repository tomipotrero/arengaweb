# Auditoría AEO — Arenga
Fecha: 2026-09-09 · Alcance: las 9 páginas y `content.json` publicado (48dec62)

Qué mira esta pasada: si la información importante se puede identificar, extraer y resumir
sin perder contexto — por una persona apurada o por un motor de respuestas. No mira
indexación ni rendimiento (eso es SEO, ya hecho) ni menciones externas (GEO, pendiente).

Nada de lo que sigue inventa datos. Donde hace falta un dato que no está en el sitio,
queda anotado como pendiente del cliente.

## Lo que ya está bien

- **Cada caso abre respondiendo.** El `intro` dice qué se hizo, para quién y con qué
  resultado en una sola oración: "Branding, social media, diseño web y diseño para RefMe Pro,
  la plataforma para árbitros. Hoy la utilizan 10 federaciones y 1500 árbitros."
- **El bloque de datos del caso es una `<dl>` limpia**: Cliente / Período / Servicios /
  Resultados. Es la estructura más fácil de extraer que tiene el sitio.
- **Las 6 capacidades y las 10 personas** están en `<h3>` con nombre y rol propios.
- **Los 21 clientes traen sector**, así que "¿con qué marcas de deporte trabajaron?"
  se responde con el contenido tal como está.
- **El proceso 01–04** (Kick off, Puesta a punto, Innovación, Creatividad) con tres líneas
  cada uno es un patrón de procedimiento correcto.
- **La entidad está bien definida**: "Arenga es la fusión de Potrero y Coach", con los dos
  enlaces reales. Eso ancla la marca.

## Hallazgos

### 1. Los cinco casos comparten el mismo párrafo de proceso — Alto
`cases[].how1` es idéntico en Megal, RefMe Pro, EigenCloud, Nacional y Altoconcepto:
"Arrancamos con un kick off para entender el negocio…". Aislado, el párrafo no dice de quién
habla, y cinco páginas con el mismo texto compiten entre sí en vez de sumar.

Mínimo: nombrar al cliente en la primera oración.
"Con Megal arrancamos con un kick off para entender el negocio…"
Mejor: una oración propia por caso (qué situación había, qué se decidió).
Dato necesario: esa oración por caso.

### 2. Las métricas no tienen fecha — Alto
"Hoy la utilizan 10 federaciones y 1500 árbitros" (RefMe Pro), "+300 assets digitales ·
+10 eventos" (EigenCloud), "Sold out en menos de un mes" (Nacional). Sin fecha, cualquiera
—persona o máquina— las cita como vigentes para siempre. Sólo Megal tiene período (2024–2025).

Propuesta: un año por caso, en el mismo bloque de datos. Es un campo nuevo en el CMS o un
uso consistente del par `metaLabel`/`metaValue` que ya existe.
Dato necesario: fecha de corte de cada métrica.

### 3. El párrafo del home no nombra a Arenga — Alto
"Productora creativa en Montevideo. Ideamos y producimos contenido relevante, y lo
amplificamos con influencers." El sujeto vive en el título ("Somos Arenga."), que es un
elemento aparte: al extraer el párrafo solo, se pierde de quién se habla.

Propuesta, cambiando cuatro palabras:
"Arenga es una productora creativa en Montevideo. Ideamos y producimos contenido relevante,
y lo amplificamos con influencers."

### 4. Dos números del home se pueden sobregeneralizar — Medio
- "03 · Países: Uruguay, Chile y Paraguay". No dice países de qué. El dato real sale del caso
  Altoconcepto (una campaña en tres países). Leído solo, se entiende como oficinas u operación.
  Propuesta: "Campañas en 3 países" o "Países donde produjimos campañas".
- "+2000 · Assets digitales entregados". En el caso Megal, los 2000 assets son de ese cliente.
  Si el número del home es el total de la agencia, conviene decirlo ("entre todos los
  proyectos"); si es de Megal, aclararlo.
Dato necesario: qué mide cada número.

### 5. Las descripciones de las capacidades están plegadas — Medio
Las 6 capacidades son la mejor respuesta que tiene el sitio a "¿qué hace Arenga?", pero sólo
se ve la primera; las otras cinco están en el acordeón. El texto sí está en el HTML y se
indexa, así que no es un problema grave, pero es contenido de primera línea escondido.

Propuesta: una línea visible por capacidad (la primera oración de cada una ya sirve) y el
resto en el acordeón. No requiere texto nuevo.

### 6. "Butacas" no se entiende fuera de contexto — Medio
"Sold out de butacas en menos de un mes" (Club Nacional de Football). Quien no siga al club
no sabe qué se vendió. Seis palabras lo resuelven.
Dato necesario: qué butacas y dónde.

### 7. Contacto no responde lo que se pregunta antes de escribir — Medio
La página tiene el formulario y el mail, y nada más. Las preguntas previas —cuánto tardan en
responder, qué tipo de proyectos toman, cómo arranca un proyecto, si trabajan fuera de
Uruguay— se responden en otras páginas o en ninguna.

Hoy mismo, sin datos nuevos: enlazar desde Contacto a "Cómo trabajamos" y a Capacidades.
Con datos: tres o cuatro respuestas cortas, no un FAQ inflado.
Dato necesario: tiempo de respuesta, tipo de proyecto y alcance geográfico.

### 8. "Selected work" en una página en español — Bajo
Como encabezado extraíble, "Trabajos seleccionados" responde mejor a quien busca en español.
El resto de los términos en inglés (social media, paid media, motion) son de industria y
están bien.

## Dependencias

- **SEO** (ya resuelto en la pasada anterior): URLs limpias, canonical, robots, alt, og:image.
  Queda pendiente del dominio: sitemap.xml y og:image absoluta.
- **SEO, recomendación de esta pasada**: cuando haya dominio, marcar cada caso como
  `CreativeWork` y las 6 capacidades como `Service`, tomando los datos de `content.json`
  (no duplicar texto en el HTML).
- **GEO**: menciones externas, perfiles y corroboración de terceros. Fuera de esta pasada.

## Lo que necesito del cliente para implementar

1. Una oración propia de proceso por caso (hallazgo 1).
2. Fecha de corte de cada métrica (hallazgo 2).
3. Qué mide "+2000 assets" y "3 países" (hallazgo 4).
4. Qué son las butacas de Nacional (hallazgo 6).
5. Tiempo de respuesta, tipo de proyectos y alcance geográfico (hallazgo 7).

Los hallazgos 3, 5 y 8 se pueden aplicar sin datos nuevos.
