# Seguimiento de Ferias

App web interna (hasta 20 usuarios) para capturar tarjetas de visita en ferias desde el móvil.
OCR gratuito en el navegador (`tesseract.js`, `spa+eng`), datos en Supabase, despliegue en Vercel.

## Stack

Next.js (App Router) · TypeScript · Tailwind · Supabase (Auth por enlace mágico, Postgres, Storage, RLS) · `tesseract.js` · `exceljs`.
Solo se usan `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. **No hay service role key** en ningún sitio.

## Desarrollo local

```bash
cp .env.example .env.local   # rellena las dos variables
npm install
npm run dev
npm test
```

> Windows: si la ruta de la carpeta contiene `&` (p. ej. `Innovation&Technology`), `npm run` falla porque `cmd.exe` interpreta el `&`.
> Ejecuta las herramientas directamente: `node node_modules/next/dist/bin/next dev`, `node node_modules/vitest/vitest.mjs run`,
> o mueve el proyecto a una ruta sin `&`.
>
> OneDrive: excluye `node_modules` y `.next` de la sincronización, o trabaja fuera de OneDrive.

## Base de datos

Las migraciones están en `supabase/migrations/` (aplicar en orden en el SQL Editor de Supabase o con la CLI).

### Añadir emails a la lista blanca

Solo los correos de `allowed_emails` pueden crear cuenta (lo impone un trigger) y ver datos (lo impone RLS con `is_allowed()`).
En el SQL Editor (los emails, siempre en minúsculas):

```sql
insert into public.allowed_emails (email) values ('nombre@empresa.com'), ('otra@empresa.com');
```

Para retirar el acceso (pierde acceso a los datos de inmediato, aunque tenga sesión abierta):

```sql
delete from public.allowed_emails where email = 'nombre@empresa.com';
```

### Crear la primera feria

Desde la app: pantalla **Eventos → Nuevo evento** (nombre, lugar, fechas). El evento recién creado queda como activo en ese dispositivo.

### Vaciar los datos tras exportar

Cada usuario solo puede borrar sus propios contactos desde la app. Para vaciar un evento completo, el propietario del proyecto puede hacerlo en el SQL Editor **después de exportar el Excel**:

```sql
-- 1) Averigua el id del evento
select id, name from public.events order by created_at desc;

-- 2) Borra los contactos y el evento
delete from public.contacts where event_id = '<id-del-evento>';
delete from public.events   where id       = '<id-del-evento>';
```

Las fotos están en el bucket privado `cards` (ruta `{event_id}/{contact_id}.jpg`). Borra la carpeta del evento desde
**Storage → cards** en el panel de Supabase (el borrado SQL de la fila no elimina el fichero).

## Configuración manual pendiente (Supabase / Vercel)

1. **Authentication → URL Configuration**: *Site URL* = URL de Vercel; *Redirect URLs* = `https://<tu-app>.vercel.app/**` y `http://localhost:3000/**`.
2. **Authentication → SMTP**: configura un SMTP propio (Resend, Brevo…). El correo integrado de Supabase tiene un límite muy bajo por hora y no aguanta a 20 usuarios pidiendo enlaces en una feria.
3. Variables de entorno en Vercel: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Insertar los emails del equipo en `allowed_emails`.

## Limitaciones conocidas del OCR

Con un OCR gratuito local, la precisión baja con fuentes decorativas, fondos oscuros o logos integrados con el texto.
Por eso la **revisión manual es obligatoria** en el flujo, con la foto visible junto a los campos. Los campos no detectados quedan vacíos; nunca se inventan.
La primera vez, `tesseract.js` descarga los datos de idioma (quedan en caché del navegador). Las fotos no salen del dispositivo para el OCR.
Anota los fallos detectados en `docs/pruebas-ocr.md`.

## Riesgos del plan gratuito (revisar antes de la primera feria)

- **Supabase gratuito:** los proyectos inactivos pueden pausarse tras unos días sin actividad; reactívalo antes de la feria. Revisa los límites vigentes de base de datos y Storage.
- **Vercel Hobby:** sus condiciones están orientadas a uso personal y no comercial. Al ser una herramienta de empresa, revisa los términos actuales.
- **RGPD:** son datos personales de terceros. Mantén los datos en la UE (comprueba la región del proyecto Supabase), limita el acceso a la lista blanca y borra tras el seguimiento.
- **Requiere conexión:** no hay modo sin conexión. Si falla el guardado, el formulario se conserva y se puede reintentar.
