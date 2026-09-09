# Arquitectura de contenido — Arenga Web

Una sola fuente de verdad, un solo camino de lectura, un solo camino de escritura.

```
Panel (Arenga Admin.dc.html)
  └── servicio de contenido            cms-store.js → window.ArengaCms
        └── adaptador de persistencia  ArengaPersistence.github  (hoy)
                                       ArengaPersistence.http    (Cloudflare, mismo contrato)
              └── origen canónico      repo tomipotrero/arengaweb @ main
                                         content.json  + media/ work/ team/ logos/

Sitio (las 9 páginas)
  └── fetch("content.json", no-store)  en cada carga, sin estado local
        └── arenga-fx.js applyContent() → [data-cms] + renderVals() de cada página
```

## Reglas

1. **content.json es el contenido.** No hay textos ni rutas de imagen duplicados en las páginas: los `src` literales se eliminaron de todos los `<image-slot data-cms>`. El texto estático que queda en el HTML es el mismo que publica el CMS y existe sólo para buscadores sin JS.
2. **El navegador no guarda contenido.** El sitio no lee localStorage, sessionStorage, IndexedDB ni sidecars. El único estado local que existe es el borrador del panel, y está sellado con la versión publicada sobre la que se hizo: si el contenido publicado cambió, el borrador se descarta al abrir el panel.
3. **Las imágenes se referencian por ruta del repositorio.** Nunca `blob:`, ni data URL persistida, ni ruta local. Las subidas del panel van a `media/` con el hash de su contenido en el nombre.
4. **Publicar es una transacción.** Datos + imágenes nuevas + baja de las que quedaron sin uso; se relee del origen canónico y se compara byte a byte. Si algo falla, no se considera publicado.
5. **La limpieza automática toca sólo `media/`.** `work/`, `team/` y `logos/` son material curado: se listan como sin uso pero no se borran solos.
6. **La caché nunca es autoridad.** Todas las lecturas de contenido y de la API van con `cache: "no-store"`; el nombre por hash hace imposible que una imagen vieja se sirva desde caché.

## Vista previa vs. sitio publicado

La copia del proyecto es una **caché de trabajo**, no la fuente. En la vista previa (`window.omelette`, `file://`, `localhost`, o cuando `runtime.canonicalOrigin` no coincide con el origen actual) `arenga-fx.js`:

- compara `content.json` local con el publicado — **una** llamada por carga, sin polling — y muestra un sello abajo a la izquierda: *igual al repo* o *⚠ distinto del repo*;
- resuelve desde el repositorio las imágenes que el CMS referencia y esta copia todavía no tiene, en memoria y sólo por esa carga.

En el sitio publicado nada de esto corre: `content.json` y las imágenes vienen del mismo origen.

## Panel

| Botón | Qué hace |
|---|---|
| Releer lo publicado | vuelve a hidratar desde el origen canónico |
| Descartar borrador | borra el buffer local y vuelve a lo publicado |
| Verificar | audita: ¿la copia local es igual a la publicada? ¿está cada imagen en el repositorio? ¿hay huérfanos en `media/`? |
| Publicar sitio | sube al repositorio las páginas y los scripts que cambiaron (compara el sha1 de git, no sube lo igual) |
| Publicar en GitHub | la transacción de contenido del punto 4 |

`admin.state.json` guarda repo, rama y token. Está en `.gitignore` y no entra en ninguna publicación.

## Migrar a Cloudflare

El panel no conoce GitHub. Cuando exista la API de producción:

```js
window.ArengaCms.fromAdapter(window.ArengaPersistence.http({ base: "/api" }))
```

El adaptador `http` ya está escrito contra el mismo contrato (`readContent`, `writeContent`, `readAsset`, `writeAsset`, `removeAsset`, `listing`) y espera:

```
GET    /api/content            -> { text, version }
PUT    /api/content            <- { text, expected }   (rechazar si version ≠ expected)
GET    /api/assets             -> { files: [{ path, sha, size }] }
POST   /api/assets             <- { path, base64 }
GET    /api/assets/:path       -> { base64, mime }
DELETE /api/assets/:path
```

`content.json` en D1 o en R2, las imágenes en R2, el resto de la lógica (hash, huérfanos, verificación, transacción) queda igual porque vive en el servicio, no en el transporte.
