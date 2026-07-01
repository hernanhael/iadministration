# gastos-app

## Contexto
App web para administrar gastos fijos personales y de vivienda.
La especificación completa está en `docs/spec.md`: modelo de datos, RLS, endpoints de IA, diseño de pantallas y plan de fases.
Consultá esa sección antes de implementar cualquier módulo nuevo.

## Stack
Next.js 16 (App Router, TypeScript) + React 19, Supabase (Auth + PostgreSQL; **sin Storage** — ver más abajo), Tailwind v4 (tema oscuro), Recharts.
Deploy en Vercel. IA con la API de Anthropic (claude-haiku-4-5 para OCR, claude-sonnet-4-6 para informes).

## Estructura
El árbol de directorios completo está en `docs/spec.md` sección 8.
Antes de crear un archivo nuevo, consultá esa sección para ubicarlo correctamente.

Desviaciones respecto del spec (decididas al armar la base):
- **Stack real:** Next.js 16 + React 19 + Tailwind v4. Tailwind v4 no usa `tailwind.config.ts`: los tokens de diseño viven en `src/app/globals.css` (`@theme`). La fuente es Nunito vía `next/font/google`.
- **Clientes Supabase** (`src/lib/supabase/`): `client.ts` (navegador, anon) · `auth-server.ts` (servidor con cookies, anon — lo usan layouts protegidos, Server Components y Server Actions para conocer al usuario) · `server.ts` (service-role, solo API routes) · `middleware.ts` (refresco de sesión + guard de rutas).
- **Auth:** server actions en `src/app/(auth)/actions.ts`; callback de email en `src/app/auth/callback/route.ts`. En `supabase/config.toml`, `enable_confirmations = false` para probar el ciclo completo en local sin servidor de correo.

Cambios de producto sobre el spec (decididos con el usuario):
- **Tema oscuro** en toda la app (tokens en `globals.css`), inspirado en un mockup del dashboard.
- **Navegación = 3 áreas:** Mes (`/dashboard`) · Histórico (`/historico`) · Gráficos e Informes (`/graficos`). Se eliminó la pestaña Servicios: la gestión de servicios y planillas se hace **desde el Mes** (candado por planilla para entrar en modo edición; ver más abajo), y la **creación de planillas** desde el **menú de usuario** del Navbar. Se borraron la ruta `/servicios` y el componente `TablaServicios`.
- **Modelo aplanado a dos niveles (decidido con el usuario):** se eliminó el `Tipo` fijo (`vivienda`/`personal`/`auto`) y el viejo concepto de **categoría** (Luz, Patente, Cochera…). Ahora **Planilla** (tabla `planillas`, **creable** por el usuario: Auto, Inmueble, Personal, "Otro Auto"…, con `nombre`, `detalle` opcional y `color`) es el nivel superior, y cada **Servicio** (luz, nafta, gimnasio) cuelga **directo** de una planilla (`servicios.planilla_id`) con su proveedor, datos y **color propio**. El gasto sigue igual (`gastos.servicio_id`). Hook `usePlanillas`, modales `ModalServicio` / `ModalPlanilla`.
- **Mes** = pantalla principal (ex Inicio, sección 6.1): encabezado **sin botones** (solo "Mes" + período), tarjetas de resumen (Pendiente / Vencidos / Pagado; los vencidos en rojo) y, debajo, **una sección por planilla** apiladas (ya no hay filtro), en orden alfabético. Cada planilla es una grilla del mes con una **franja al pie con el total**, y es **colapsable/expandible** (chevron en el encabezado; al colapsar muestra el total del rubro al lado del título).
  - **Tarjetas de resumen (`ResumenCards`):** 3 cards siempre visibles independientemente de la pestaña activa: **Ingresos** (verde), **Egresos** (rojo), **Resultado** (gris, centrado, `text-3xl`). Cada card incluye desglose por planilla del tipo correspondiente. La **barra de progreso "Pagado del mes"** (egresos `pagado / total`) solo aparece cuando la pestaña activa es **Egresos**; en Ingresos no se muestra.
  - **Orden alfabético en todo:** planillas, servicios y filas de gasto se ordenan por nombre (helper `porNombre` en `src/lib/formateo.ts`; demo ordenado en los hooks, consulta real ya ordena por `nombre`).
  - **Planillas dinámicas:** `PlanillasPeriodo` y `ResumenCards` reciben las planillas del usuario (`usePlanillas`) y agrupan los gastos por `planilla_id` (vía `g.servicios?.planilla_id`). El punto de color de la grilla sale del **color del servicio**. Los usuarios comienzan sin planillas y las crean desde cero.
  - **Gestión con candado (modo edición por planilla):** cada planilla tiene a la derecha de su título un **candado** (ícono suelto, sin contorno ni fondo; cerrado por defecto, estado `desbloqueadas` por sesión en `PlanillasPeriodo`; **los controles de gestión — candado, lápiz, papelera — se ocultan cuando la planilla está colapsada**). **Bloqueada = uso normal del mes** (marcar pagado, OCR cámara/documento, link), pero **sin el ⋯** en las filas. **Desbloqueada** (candado abierto, en verde): aparece el **⋯** por fila (Editar servicio / Editar gasto del mes / Eliminar servicio; prop `puedeEditar` de `GrillaGastos`), una fila **"+ Agregar gasto o servicio"** al pie de la grilla (abre `ModalServicio` con la planilla preseleccionada vía `planillaIdInicial`), y en el encabezado un **lápiz** (editar la planilla → `ModalPlanilla`) y una **papelera** (eliminar → `Confirmacion`). **Crear una planilla nueva** se hace desde el **menú de usuario** del Navbar (`MenuUsuario`: avatar → "Nueva planilla" / "Salir"); como es global y cada pantalla carga sus propios datos, al crear con éxito recarga el Mes (`window.location.assign('/dashboard')`).
  - **Grilla** (`GrillaGastos`): columnas de ancho fijo para que encabezados y contenido queden alineados. **Servicio** = punto de color del servicio + nombre, y debajo **proveedor · N° cliente**. Luego **Monto**, **Vencimiento** (fecha completa dd/mm/aaaa), **Pago** (ícono de check → al activarse muestra la fecha de pago en verde; clic de nuevo revierte) y **Acciones**: cámara (foto) · documento (adjuntar imagen/PDF) · link externo · ⋯ menú (Editar servicio / Editar gasto del mes / Eliminar servicio). Cámara y documento son **dos entradas al mismo OCR**: ambas abren `ModalOcr` (prop `modo: 'foto' | 'documento'`), la IA extrae monto/vencimiento y **precarga** el gasto para confirmar. **El archivo no se guarda** (decisión de producto: no acumular facturas/documentación; se lee en memoria y se descarta). La cámara es una entrada de archivo con `capture` dentro de la propia fila, así que **abre la cámara directo** (dentro del gesto) y la foto tomada se pasa al OCR ya cargada (`ModalOcr` recibe `archivoInicial`); el documento acepta imagen o PDF. La cámara/documento y el link quedan visibles siempre; el ⋯ solo aparece con la planilla **desbloqueada** (`puedeEditar`). Tiene un modo `soloLectura` (sin acciones ni toggle) que usa Histórico. La franja del pie de cada planilla muestra solo **"Total"** (sin el nombre de la planilla).
  - **Reinicio mensual del Mes:** el Mes muestra todos los servicios activos del período; los que aún no tienen gasto cargado aparecen como **fila "reiniciada"** (id `nuevo:<servicioId>`, **monto y vencimiento sin valor**, a confirmar) hasta que se cargue el documento. Es el equivalente en cliente de `generar_gastos_periodo` (`PlanillasPeriodo` + helpers en `dashboard/page.tsx`). Marcar pagado / cargar el monto en una fila reiniciada **crea** el gasto (en vez de actualizar). Con Supabase, la generación real sigue siendo vía la función SQL.
- **Histórico** (`/historico`): meses ya cerrados (período < actual). Un **renglón compacto** con un **stepper de mes** —flechas ‹ › que avanzan de a un mes calendario (limitadas al rango con datos) + el texto del mes que abre un **almanaque** (`SelectorMes` variante `inline`: navegación de año + grilla de meses, selección en gris, tema oscuro) para saltar a cualquier mes/año anterior— y, a la derecha, el **total gastado** en línea (rojo). Si el mes elegido no tiene gastos, muestra un aviso. Reutiliza `PlanillasPeriodo` en modo `soloLectura`, **no colapsable** (`colapsable={false}`) y **ocultando planillas vacías** (`ocultarVacias`). Los meses se incorporan solos al vencer. Carga planillas con `incluirInactivas: true` para que los gastos históricos de planillas/servicios eliminados sigan visibles.
- **Campo `servicios.nro_cliente`** (N° de cliente/cuenta) y **`servicios.color`** (punto de color de la grilla) viven en `0001_init.sql`.
- **Servicios acumulables (ej. nafta):** un servicio puede marcarse **`acumulable`** (check en `ModalServicio`). En el Mes sigue siendo **una sola fila** (no se crea una fila por carga): el gasto del mes acumula varias **cargas** `{monto, fecha}` en una columna `gastos.cargas` (jsonb) y el `monto` de la fila es la **suma**. No tienen vencimiento; cada carga **se paga al hacerse** (la fila se muestra pagada con la fecha de la última carga). Las cargas se gestionan en `ModalCargas` (ver/agregar/quitar); también la cámara/OCR de la fila agrega una carga. La RPC `generar_gastos_periodo` arranca el mes de un acumulable **sin monto ni vencimiento**. Tipo `Carga` en `database.ts`; helpers `sumarCargas` / `ultimaFechaCarga` en `formateo.ts`.
- **Gráfico de evolución:** se reemplazaron los desplegables Planilla/Servicio y las pills "Ver por" por **chips de color** al pie del recuadro (una fila por planilla con sus servicios al lado). Cada chip activo = una línea (planilla = suma de sus servicios; servicio = solo ese); activo = color pleno, inactivo = mismo color pero tenue. Arriba queda solo el filtro de **Tiempo**. Por defecto vienen activas todas las planillas.
- **Modal por portal:** `Modal` se renderiza con `createPortal` a `document.body` para no quedar atrapado en el contexto de apilamiento del Navbar (antes la card de "Nueva planilla" aparecía detrás de la app).
- **Módulo de Ingresos (2026-06-19):** toggle **Ingresos | Egresos** (`TabTipo`) en Mes e Histórico, inline a la derecha del `<h1>` de cada página (`flex items-center justify-between`). Orden de tabs: Ingresos primero (alfabético). En **Gráficos e Informes no hay switch**: muestra egresos e ingresos combinados. Campo `planillas.tipo: 'egreso' | 'ingreso'`; migración `0002_ingresos.sql`. Las planillas de ingreso no muestran columna Vencimiento (`sinVencimiento` en `GrillaGastos`) y tienen los totales del pie en verde (`colorPie='success'`). `ModalPlanilla` tiene selector de tipo **solo al crear** (no al editar). Datos demo: planilla "Trabajo", servicios Sueldo + Freelance (acumulable), 5 gastos en 3 meses.
- **Borrado lógico de servicios y planillas (2026-06-22):** `servicios.activo` y `planillas.activo` (migración `0003_activo_planillas.sql`). Al eliminar un servicio: se borra el gasto no confirmado del mes actual + `activo = false`. Al eliminar una planilla: se desactivan sus servicios + gastos no confirmados del mes + `activo = false`. Ambos se omiten en meses futuros (`generar_gastos_periodo`) pero sus gastos históricos siguen visibles en Histórico (`incluirInactivas: true` en `usePlanillas`). Nunca se elimina físicamente nada que tenga historial.
- **Modo vista previa** (`src/lib/preview.ts`): sin credenciales de Supabase, la app levanta con datos demo (`DEMO_PLANILLAS` / `DEMO_SERVICIOS` / `DEMO_GASTOS`) y las mutaciones avisan en vez de persistir. Se apaga solo al completar `.env.local`.
- **Importación automática de facturas por Gmail (2026-06-30):** cron diario (`vercel.json`, `0 9 * * *`) que llama a `GET /api/cron/gmail-facturas`. Lee el Gmail del usuario (OAuth de una sola cuenta, scope `gmail.readonly`; refresh token obtenido una vez con `scripts/gmail-auth.ts` y guardado en `GMAIL_REFRESH_TOKEN`), matchea cada correo reciente contra los `servicios` activos y no acumulables con Claude (`claude-haiku-4-5`, mismo patrón `zodOutputFormat` que `ocr-factura`) y, si hay match con confianza razonable y un monto, **guarda el gasto sin confirmación del usuario** — excepción explícita a la regla de IA (ver sección "Reglas que aplican siempre"). Nunca pisa un gasto ya confirmado a mano. Migración `0006_gmail_auto_import.sql` agrega `gastos.origen_email` (marca visual con `IconMail` en `GrillaGastos`, junto al nombre del servicio) y la tabla `gmail_procesados` (dedup por `gmail_message_id` + auditoría de cada corrida: `aplicado` / `sin_match` / `sin_monto` / `ya_confirmado` / `error`). Primer consumidor real de `createAdminClient()` (service-role): las rutas de IA anteriores usaban `auth-server.ts` porque corrían con sesión de usuario; el cron no tiene cookies, así que usa `CRON_USER_ID` (env var, mismo valor que `MIGRATION_USER_ID`) para saber de quién son los datos. Servicios acumulables (nafta) quedan fuera de esta primera versión.

## Decisiones de UI/UX (2026-06-22)

- **`ModalServicio` al crear:** sin selector de planilla (se toma de `planillaIdInicial`), sin campo "Día de vencimiento" (solo visible al editar) y sin checkbox "Activo" (un servicio nuevo siempre es activo; la desactivación se hace vía "Eliminar servicio"). Formulario compacto.
- **`ModalPlanilla`:** selector de tipo (Ingresos/Egresos) solo al crear, nunca al editar.
- **Menú ⋯ de cada fila:** "Editar servicio" / "Editar gasto del mes" (solo servicios normales) / "Eliminar servicio". Se eliminó la opción "Eliminar del mes" para evitar confusión con el borrado lógico.
- **"Editar gasto del mes" (`FormularioGasto`):** sin selector de Servicio (ya viene del contexto), sin campo Período (siempre el mes actual), monto como `type="text"` (sin flechas de paso), fechas (vencimiento / fecha de pago) como texto en formato `dd/mm/aaaa` (conversión ISO ↔ display dentro del componente) para mantener la apariencia del resto de los inputs. Botón "Guardar" (sin "cambios").
- **Botones "Guardar" / "Aceptar":** estilo `primary` con borde de color y tint sutil, no sólido.
- **Inputs de fecha (`type="text"`, `placeholder="dd/mm/aaaa"`):** reemplazaron a `<input type="date">` en `FormularioGasto` para mantener apariencia consistente. Fecha nativa sigue usando `<input type="date">` con `color-scheme: dark` en el resto de la app (ej. `SelectorMes`).

## Bugs resueltos en producción (2026-06-22)

- **Planillas de egreso no aparecían:** tenían `activo = false` por pruebas locales previas. Fix de datos vía SQL (`UPDATE planillas SET activo = true WHERE activo = false`) + migración `0004` con índice único parcial.
- **No se podía recrear una planilla con el mismo nombre:** el constraint `unique(user_id, nombre)` bloqueaba la creación aunque la planilla estuviera eliminada. Fix: migración `0004_partial_unique_planillas.sql` reemplaza el constraint por un índice parcial `WHERE activo = true`; `usePlanillas.crear` reactiva la planilla eliminada si existe una con el mismo nombre.
- **Eliminar servicio con gasto confirmado no lo quitaba del Mes:** `delMes` incluía gastos de servicios inactivos porque no filtraba por `activo`. Fix: `delMes` en `dashboard/page.tsx` ahora construye `activosIds` a partir de `serv.servicios.filter(s => s.activo)` y excluye los demás.
- **Burbujas de ResumenCards mostraban egreso fantasma al eliminar planilla:** `serv.servicios` no se recargaba tras borrar una planilla, por lo que sus servicios seguían siendo visibles en memoria. Fix: `serv.recargar()` llamado explícitamente después de `pl.eliminar()` en el dashboard.
- **ResumenCards incluía gastos de planillas inactivas:** `delMes` filtraba servicios inactivos pero no cruzaba contra planillas activas; gastos de planillas eliminadas aparecían en las cards sin sección visible debajo. Fix: `delMes` en `dashboard/page.tsx` construye `plActivas` (set de `planilla_id` de planillas con `activo = true`) y excluye gastos cuyo `planilla_id` no esté en ese set.

## Estado al 2026-06-30
**App completamente funcional en producción (Vercel).** Fases 1–5 + módulo de ingresos + borrado lógico + deploy verificados.

- **Deploy:** ✅ app en Vercel conectada al repo `hernanhael/iadministration`. Variables de entorno cargadas en Vercel. Deploy automático en cada push a `main`.
- **Backend Supabase:** ✅ proyecto `mramvepdcosmylxeaden` activo. Migraciones `0001` a `0004` aplicadas.
- **Auth:** ✅ registro, login y sesión verificados en producción. URL de callback configurada en Supabase.
- **CRUD:** ✅ planillas, servicios y gastos funcionando con datos reales.
- **Recurrencia:** ✅ `generar_gastos_periodo` genera filas al abrir el Mes.
- **OCR:** ✅ `POST /api/ocr-factura` con claude-haiku-4-5 funcionando.
- **Informe IA:** ✅ `POST /api/informe` con claude-sonnet-4-6 funcionando.
- **Módulo ingresos:** ✅ toggle Ingresos/Egresos en Mes e Histórico; gráficos muestran ambos tipos combinados.
- **Borrado lógico:** ✅ servicios y planillas se desactivan preservando el historial.
- **`.env.local`:** ✅ configurado (no commitear — está en `.gitignore`).
- **`.env.example`:** ✅ commiteado como referencia de las variables necesarias (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_USER_EMAIL`, `CRON_USER_ID`, `CRON_SECRET`).
- **Cron de importación por Gmail:** ⏳ código listo (`GET /api/cron/gmail-facturas`), pendiente de setup manual (proyecto Google Cloud + OAuth + migración `0006` + carga de variables) antes de activarse en producción. No requiere configurar nada por servicio: el matching es por IA contra `empresa`/`nombre`.
- **Migración histórica:** ✅ historial 2024–2026 importado desde Google Sheets vía dos scripts de migración. Ambos ya fueron ejecutados y no necesitan volver a correrse. Leen credenciales desde `.env.local` + variable `MIGRATION_USER_ID`.
  - `scripts/migrate-sheets.ts`: planillas "Inmueble" (Av. Nicolás Avellaneda 632, 4A) y "Cochera N° 10" con sus servicios y 166 gastos históricos (2024-05 → 2026-06).
  - `scripts/migrate-personal.ts`: planilla "Personal" (egreso, 14 servicios) y "Ingresos Mensuales" (ingreso, 5 servicios) con 216 egresos (2024-08 → 2026-06) y 17 ingresos (2026-01 → 2026-06). Excluye "Cochera del Departamento" y "Departamento" de los egresos. Servicios inactivos: Apple Cloud 2, Keepa, ML Nivel 6, SanCor.

**Próximo paso — activar el cron de importación por Gmail (código ya en `main`, falta el setup manual):**
1. Google Cloud: crear/seleccionar proyecto, habilitar Gmail API, pantalla de consentimiento OAuth (tipo External, usuario `hernanhael@gmail.com`, **Publishing status = "In production"** — no "Testing", o el refresh token expira a los 7 días), credencial OAuth **Desktop app** → `client_id`/`client_secret`.
2. Correr una vez: `GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... npx tsx scripts/gmail-auth.ts` → guarda el `GMAIL_REFRESH_TOKEN` que imprime.
3. Aplicar `supabase/migrations/0006_gmail_auto_import.sql` en el SQL Editor de Supabase (proyecto `mramvepdcosmylxeaden`) — mismo mecanismo manual usado para `0005`.
4. Cargar en Vercel (Project Settings → Environment Variables) y en `.env.local`: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_USER_EMAIL`, `CRON_USER_ID` (mismo valor que `MIGRATION_USER_ID`), `CRON_SECRET` (generar con `openssl rand -base64 32`).
5. Probar local antes de confiar en el cron real: `npm run dev` + `curl -i http://localhost:3000/api/cron/gmail-facturas -H "Authorization: Bearer $CRON_SECRET"`, revisar la respuesta y los `gastos`/`gmail_procesados` en Supabase.
6. Deploy y confirmar en el dashboard de Vercel (Cron Jobs) que el primer disparo real devuelve 200.

Una vez activo, próximo paso general: uso real y feedback del usuario.

El plan de cierre de cada fase está en la sección 9 del spec (`docs/spec.md`).

## Reglas que aplican siempre

**Seguridad**
- `ANTHROPIC_API_KEY` y `SUPABASE_SERVICE_ROLE_KEY` solo en código de servidor (API routes). Nunca en componentes ni hooks del cliente.
- `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` y `CRON_SECRET` solo se usan en `src/lib/gmail.ts` y `src/app/api/cron/gmail-facturas/route.ts`; nunca en cliente.
- Toda tabla nueva lleva `user_id` y política RLS antes del primer insert.
- Las facturas/documentación **no se almacenan**: el OCR lee la foto en memoria para extraer monto/vencimiento y la imagen se descarta (no hay bucket de Storage ni columna `factura_img`).

**Modelo de datos**
- Los gastos generados por recurrencia llevan `monto_confirmado = false`.
- El estado "vencido" no se almacena: se deriva como `estado = 'pendiente' AND vencimiento < now()`.
- Borrado de servicios y planillas con historial: lógico (`activo = false`), nunca físico.
- Período siempre en formato `YYYY-MM`.

**IA**
- El gasto nunca se guarda automáticamente desde el OCR: requiere confirmación explícita del usuario.
- **Excepción — cron de importación por Gmail (`GET /api/cron/gmail-facturas`):** este cron diario SÍ guarda el gasto automáticamente, sin confirmación del usuario — excepción deliberada, decidida explícitamente con el usuario pese al riesgo de que un monto/vencimiento erróneo entre silenciosamente a sus números reales. Solo actúa cuando Claude matchea el correo a un servicio existente con confianza razonable y extrae un monto; si no, no toca `gastos`. Cada fila auto-cargada queda marcada (`gastos.origen_email = true`, visible en el Mes) y cada correo procesado deja rastro en `gmail_procesados` (dedup: un mismo `gmail_message_id` con resultado decisivo nunca se reprocesa). El flujo manual de foto/documento (`/api/ocr-factura`) no cambia: sigue requiriendo confirmación explícita.
- Los endpoints `/api/ocr-factura` y `/api/informe` validan la sesión antes de llamar a la API de Anthropic. El cron de Gmail no tiene sesión de usuario (no hay cookies): se protege con `CRON_SECRET` (Bearer token que envía Vercel) y usa el cliente service-role (`createAdminClient`), no `auth-server.ts`.
- Al informe se le envían solo los agregados numéricos, nunca las imágenes ni datos personales.

**UI**
- Idioma: español en toda la interfaz, mensajes de error y validaciones.
- Tipografía: Nunito para texto; `font-variant-numeric: tabular-nums` en todos los montos.
- Filas atenuadas (`opacity: 0.6`, no se ocultan): pagadas, o sin cargar todavía (fila "reiniciada" sin monto confirmado, o acumulable sin cargas). Solo las pendientes con monto ya cargado quedan iluminadas (`flags().sinCargar` en `GrillaGastos.tsx`).
- La columna "Pago" de `GrillaGastos` se llama "Cobro" en las planillas de ingreso (misma condición `sinVencimiento`).
- Los botones de cámara (foto) y documento (adjuntar imagen/PDF) son visibles en cada fila, no están escondidos en un menú. El archivo se usa solo para el OCR y no se guarda.

## Comandos
```bash
npm run dev          # desarrollo local
npm run build        # build de producción
npm run lint         # linting
supabase gen types typescript --linked > src/types/database.ts  # regenerar tipos tras cambios de esquema
```
