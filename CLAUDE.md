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
- **Mes** = pantalla principal (ex Inicio, sección 6.1): encabezado **sin botones** (solo "Mes" + período), tarjetas de resumen (Pendiente / Vencidos / Pagado; los vencidos en rojo) y, debajo, **una sección por planilla** apiladas (ya no hay filtro), en orden alfabético. Cada planilla es una grilla del mes con una **franja roja al pie con el total del rubro**, y es **colapsable/expandible** (chevron en el encabezado; al colapsar muestra el total del rubro al lado del título).
  - **Tarjetas de resumen (`ResumenCards`):** 3 cards siempre visibles independientemente de la pestaña activa: **Ingresos** (verde), **Egresos** (rojo), **Resultado** (gris, centrado, `text-3xl`). Cada card incluye desglose por planilla del tipo correspondiente. La **barra de progreso "Pagado del mes"** (egresos `pagado / total`) solo aparece cuando la pestaña activa es **Egresos**; en Ingresos no se muestra.
  - **Orden alfabético en todo:** planillas, servicios y filas de gasto se ordenan por nombre (helper `porNombre` en `src/lib/formateo.ts`; demo ordenado en los hooks, consulta real ya ordena por `nombre`).
  - **Planillas dinámicas:** `PlanillasPeriodo` y `ResumenCards` reciben las planillas del usuario (`usePlanillas`) y agrupan los gastos por `planilla_id` (vía `g.servicios?.planilla_id`). El seed de `0001_init.sql` crea 3 planillas iniciales (Auto, Inmueble, Personal); los servicios los crea cada usuario. El punto de color de la grilla sale del **color del servicio**.
  - **Gestión con candado (modo edición por planilla):** cada planilla tiene a la derecha de su título un **candado** (ícono suelto, sin contorno ni fondo; cerrado por defecto, estado `desbloqueadas` por sesión en `PlanillasPeriodo`; **los controles de gestión — candado, lápiz, papelera — se ocultan cuando la planilla está colapsada**). **Bloqueada = uso normal del mes** (marcar pagado, OCR cámara/documento, link), pero **sin el ⋯** en las filas. **Desbloqueada** (candado abierto, en verde): aparece el **⋯** por fila (Editar servicio / Editar gasto / Eliminar; prop `puedeEditar` de `GrillaGastos`), una fila **"+ Agregar servicio"** al pie de la grilla (abre `ModalServicio` con la planilla preseleccionada vía `planillaIdInicial`), y en el encabezado un **lápiz** (editar la planilla → `ModalPlanilla`) y una **papelera** (eliminar → `Confirmacion`, avisa si tiene servicios). **Crear una planilla nueva** se hace desde el **menú de usuario** del Navbar (`MenuUsuario`: avatar → "Nueva planilla" / "Salir"); como es global y cada pantalla carga sus propios datos, al crear con éxito recarga el Mes (`window.location.assign('/dashboard')`).
  - **Grilla** (`GrillaGastos`): columnas de ancho fijo para que encabezados y contenido queden alineados. **Servicio** = punto de color del servicio + nombre, y debajo **proveedor · N° cliente**. Luego **Monto**, **Vencimiento** (fecha completa dd/mm/aaaa), **Pago** (ícono de check → al activarse muestra la fecha de pago en verde; clic de nuevo revierte) y **Acciones**: cámara (foto) · documento (adjuntar imagen/PDF) · link externo · ⋯ menú (Editar servicio / Editar gasto del mes / Eliminar). Cámara y documento son **dos entradas al mismo OCR**: ambas abren `ModalOcr` (prop `modo: 'foto' | 'documento'`), la IA extrae monto/vencimiento y **precarga** el gasto para confirmar. **El archivo no se guarda** (decisión de producto: no acumular facturas/documentación; se lee en memoria y se descarta). La cámara es una entrada de archivo con `capture` dentro de la propia fila, así que **abre la cámara directo** (dentro del gesto) y la foto tomada se pasa al OCR ya cargada (`ModalOcr` recibe `archivoInicial`); el documento acepta imagen o PDF. La cámara/documento y el link quedan visibles siempre; el ⋯ solo aparece con la planilla **desbloqueada** (`puedeEditar`). Tiene un modo `soloLectura` (sin acciones ni toggle) que usa Histórico.
  - **Reinicio mensual del Mes:** el Mes muestra todos los servicios activos del período; los que aún no tienen gasto cargado aparecen como **fila "reiniciada"** (id `nuevo:<servicioId>`, **monto y vencimiento sin valor**, a confirmar) hasta que se cargue el documento. Es el equivalente en cliente de `generar_gastos_periodo` (`PlanillasPeriodo` + helpers en `dashboard/page.tsx`). Marcar pagado / cargar el monto en una fila reiniciada **crea** el gasto (en vez de actualizar). ⚠️ Con Supabase, la generación real sigue siendo vía la función SQL (Fase 3).
- **Histórico** (`/historico`): meses ya cerrados (período < actual). Un **renglón compacto** con un **stepper de mes** —flechas ‹ › que avanzan de a un mes calendario (limitadas al rango con datos) + el texto del mes que abre un **almanaque** (`SelectorMes` variante `inline`: navegación de año + grilla de meses, selección en gris, tema oscuro) para saltar a cualquier mes/año anterior— y, a la derecha, el **total gastado** en línea (rojo). Si el mes elegido no tiene gastos, muestra un aviso. Reutiliza `PlanillasPeriodo` en modo `soloLectura`, **no colapsable** (`colapsable={false}`) y **ocultando planillas vacías** (`ocultarVacias`). Los meses se incorporan solos al vencer.
- **Campo `servicios.nro_cliente`** (N° de cliente/cuenta) y **`servicios.color`** (punto de color de la grilla) viven en `0001_init.sql`.
- **Servicios acumulables (ej. nafta):** un servicio puede marcarse **`acumulable`** (check en `ModalServicio`). En el Mes sigue siendo **una sola fila** (no se crea una fila por carga): el gasto del mes acumula varias **cargas** `{monto, fecha}` en una columna `gastos.cargas` (jsonb) y el `monto` de la fila es la **suma**. No tienen vencimiento; cada carga **se paga al hacerse** (la fila se muestra pagada con la fecha de la última carga). Las cargas se gestionan en `ModalCargas` (ver/agregar/quitar); también la cámara/OCR de la fila agrega una carga. La RPC `generar_gastos_periodo` arranca el mes de un acumulable **sin monto ni vencimiento**. Tipo `Carga` en `database.ts`; helpers `sumarCargas` / `ultimaFechaCarga` en `formateo.ts`.
- **Gráfico de evolución:** se reemplazaron los desplegables Planilla/Servicio y las pills "Ver por" por **chips de color** al pie del recuadro (una fila por planilla con sus servicios al lado). Cada chip activo = una línea (planilla = suma de sus servicios; servicio = solo ese); activo = color pleno, inactivo = mismo color pero tenue. Arriba queda solo el filtro de **Tiempo**. Por defecto vienen activas todas las planillas.
- **Modal por portal:** `Modal` se renderiza con `createPortal` a `document.body` para no quedar atrapado en el contexto de apilamiento del Navbar (antes la card de "Nueva planilla" aparecía detrás de la app).
- **Módulo de Ingresos (2026-06-19):** toggle **Ingresos | Egresos** (`TabTipo`) en Mes e Histórico, inline a la derecha del `<h1>` de cada página (`flex items-center justify-between`). Orden de tabs: Ingresos primero (alfabético). En **Gráficos e Informes no hay switch**: muestra egresos e ingresos combinados (filtrado por tipo se definirá aparte). Campo `planillas.tipo: 'egreso' | 'ingreso'`; migración `0002_ingresos.sql`. Las planillas de ingreso no muestran columna Vencimiento (`sinVencimiento` en `GrillaGastos`) y tienen los totales del pie en verde (`colorPie='success'`). `ModalPlanilla` tiene selector de tipo al crear o editar. Datos demo: planilla "Trabajo", servicios Sueldo + Freelance (acumulable), 5 gastos en 3 meses.
- **Modo vista previa** (`src/lib/preview.ts`): sin credenciales de Supabase, la app levanta con datos demo (`DEMO_PLANILLAS` / `DEMO_SERVICIOS` / `DEMO_GASTOS`) y las mutaciones avisan en vez de persistir. Se apaga solo al completar `.env.local`.

## Estado al 2026-06-19
**Las 5 fases están con el código completo + módulo de ingresos** (build/lint/tsc en verde). Todo corre en **modo vista previa** con datos demo porque `.env.local` está vacío (no hay proyecto Supabase ni `ANTHROPIC_API_KEY` todavía).

- **Modelo (planilla → servicio → gasto):** ✅ completo. `planillas` tiene columna `tipo` ('egreso'|'ingreso'). `0001_init.sql` (esquema base) y `0002_ingresos.sql` (columna tipo + seed actualizado). ⏳ falta correr ambas migraciones y verificar con Supabase.
- **Fases 1–5:** ✅ código completo. ⏳ falta verificar con Supabase real y probar OCR/informe con API key real.
- **Módulo ingresos:** ✅ completo en código y demo. ⏳ falta correr `0002_ingresos.sql` en Supabase.

**Próximo paso (retomar acá):** provisionar el backend real — crear el proyecto Supabase, correr **`0001_init.sql`** y luego **`0002_ingresos.sql`** en el SQL editor (no hay CLI instalado), llenar `.env.local` (URL + anon + service_role + `ANTHROPIC_API_KEY`) y verificar contra datos reales (auth, RLS, CRUD planillas/servicios/gastos, recurrencia, OCR, informe).

El plan de cierre de cada fase está en la sección 9 del spec (`docs/spec.md`).

## Reglas que aplican siempre

**Seguridad**
- `ANTHROPIC_API_KEY` y `SUPABASE_SERVICE_ROLE_KEY` solo en código de servidor (API routes). Nunca en componentes ni hooks del cliente.
- Toda tabla nueva lleva `user_id` y política RLS antes del primer insert.
- Las facturas/documentación **no se almacenan**: el OCR lee la foto en memoria para extraer monto/vencimiento y la imagen se descarta (no hay bucket de Storage ni columna `factura_img`).

**Modelo de datos**
- Los gastos generados por recurrencia llevan `monto_confirmado = false`.
- El estado "vencido" no se almacena: se deriva como `estado = 'pendiente' AND vencimiento < now()`.
- Borrado de servicios con historial: lógico (`activo = false`), nunca físico.
- Período siempre en formato `YYYY-MM`.

**IA**
- El gasto nunca se guarda automáticamente desde el OCR: requiere confirmación explícita del usuario.
- Los endpoints `/api/ocr-factura` y `/api/informe` validan la sesión antes de llamar a la API de Anthropic.
- Al informe se le envían solo los agregados numéricos, nunca las imágenes ni datos personales.

**UI**
- Idioma: español en toda la interfaz, mensajes de error y validaciones.
- Tipografía: Nunito para texto; `font-variant-numeric: tabular-nums` en todos los montos.
- Las filas pagadas se muestran atenuadas (`opacity: 0.6`), no se ocultan.
- Los botones de cámara (foto) y documento (adjuntar imagen/PDF) son visibles en cada fila, no están escondidos en un menú. El archivo se usa solo para el OCR y no se guarda.

## Comandos
```bash
npm run dev          # desarrollo local
npm run build        # build de producción
npm run lint         # linting
supabase gen types typescript --linked > src/types/database.ts  # regenerar tipos tras cambios de esquema
```
