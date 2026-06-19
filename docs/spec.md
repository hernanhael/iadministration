# Especificación técnica — App de gestión de gastos fijos

Versión 1.0 — Junio 2026. Documento de diseño para desarrollo con Claude Code.

---

## Estado de implementación y decisiones (actualizado 2026-06-18)

> Esta sección refleja lo construido y las decisiones tomadas con el usuario durante el desarrollo. Cuando contradiga al diseño original de abajo, **prevalece esta sección**. El detalle vivo y más fino está en `CLAUDE.md`; el resto de este documento se conserva como referencia de intención de diseño original.

**Stack real:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + Recharts. Supabase (`@supabase/supabase-js` + `@supabase/ssr`). IA con `@anthropic-ai/sdk`. Tailwind v4 no usa `tailwind.config.ts`: los tokens viven en `src/app/globals.css` (`@theme`). Fuente Nunito.

**Tema visual:** **oscuro** en toda la app (no claro), inspirado en un mockup del dashboard provisto por el usuario. Montos en cifras tabulares. Los totales se muestran en **rojo** (franja de cada planilla, total de Histórico, total del mes en la barra de progreso). Pagado / acción principal en verde (`--brand`).

**⚠️ Modelo aplanado a dos niveles (reemplaza el diseño de tres niveles `Tipo`→`categorias`→`servicios`):** se eliminó el `Tipo` fijo (`vivienda`/`personal`/`auto`) y la tabla `categorias`. Ahora:
- **`planillas`** (tabla propia, **creable por el usuario**: Auto, Inmueble, Personal, "Otro Auto"…, con `nombre`, `detalle` opcional y `color`) es el nivel superior.
- Cada **`servicio`** (luz, nafta, gimnasio) cuelga **directo** de una planilla (`servicios.planilla_id`) con su `color` propio.
- El **`gasto`** sigue igual (`gastos.servicio_id`).
- Hooks: `usePlanillas` / `useServicios` / `useGastos`. Modales: `ModalPlanilla` / `ModalServicio`. Se eliminaron `useCategorias`, `ModalCategoria`, `SeccionCategorias` y `src/lib/tipos.ts`.

**Navegación = 3 áreas** (cambio respecto de las 5 pantallas originales):
- **Mes** (`/dashboard`) — pantalla principal (ex "Inicio", sección 6.1) **y hub de gestión** (ver detalle abajo).
- **Histórico** (`/historico`) — meses ya cerrados (período < actual) con filtro temporal.
- **Gráficos e Informes** (`/graficos`) — gráfico de evolución (Recharts) **+ Informes con IA fusionados acá**.
- **Eliminadas:** las pantallas separadas "Carga" e "Historial" y **la pestaña "Servicios"** (su CRUD se gestiona desde el Mes). Se borraron la ruta `/servicios` y el componente `TablaServicios`.

**Área "Mes" (detalle):**
- Encabezado **sin botones** (solo "Mes" + período).
- **Tarjetas de resumen (`ResumenCards`):** Pendiente / Vencidos / Pagado, cada una con su total **+ desglose por planilla** (las del usuario, vía `usePlanillas`). Debajo, una **barra de progreso sutil** del total del mes: `pagado / total · %`.
- **Una sección por planilla, apiladas** (sin filtro), en orden alfabético. Cada planilla = una grilla (`GrillaGastos`) con **franja roja al pie con el total del rubro**, **colapsable/expandible** (al colapsar muestra su total junto al título). Componente reutilizable: `PlanillasPeriodo`, que agrupa los gastos por `planilla_id`.
- **Gestión con candado (modo edición por planilla):** cada planilla tiene a la derecha de su título un **candado** (cerrado por defecto). **Bloqueada** = uso normal (marcar pagado, OCR, link), sin el ⋯ de las filas. **Desbloqueada** (candado verde) = aparece el ⋯ por fila (Editar servicio / Editar gasto / Eliminar), la fila **"+ Agregar servicio"** al pie y, en el encabezado, **lápiz** (editar planilla) y **papelera** (eliminar). **Los controles de gestión se ocultan cuando la planilla está colapsada.** **Crear una planilla nueva** se hace desde el **menú de usuario** del Navbar (`MenuUsuario`: avatar → "Nueva planilla" / "Salir").
- **Grilla:** columnas de ancho fijo. **Servicio** = punto de color del servicio + nombre, y debajo **proveedor · N° cliente**. Luego **Monto**, **Vencimiento** (dd/mm/aaaa), **Pago** (ícono de check → al activarlo guarda la fecha de hoy en verde; clic de nuevo revierte) y **Acciones**: cámara · documento · link externo · ⋯. **La cámara abre la cámara directo** (entrada de archivo con `capture` dentro de la fila, dentro del gesto del usuario) y pasa la foto al OCR ya cargada; el documento acepta imagen o PDF. Cámara y documento son **dos entradas al mismo OCR** (`ModalOcr`, prop `modo`); **el archivo no se guarda**. Filas pagadas atenuadas.
- **Servicios acumulables (ej. nafta):** un servicio puede marcarse **`acumulable`** (check en `ModalServicio`). En el Mes sigue siendo **una sola fila** (no una por carga): el gasto del mes acumula varias **cargas** `{monto, fecha}` en `gastos.cargas` (jsonb) y su `monto` es la **suma**. No tienen vencimiento; cada carga **se paga al hacerse** (la fila se ve pagada con la fecha de la última carga). Las cargas se gestionan en `ModalCargas` (ver/agregar/quitar); la cámara/OCR de la fila agrega una carga. Helpers `sumarCargas` / `ultimaFechaCarga` (`formateo.ts`); tipo `Carga` (`database.ts`).
- **Reinicio mensual:** el Mes lista **todos los servicios activos** del período; los que aún no tienen gasto aparecen como **fila "reiniciada"** (id `nuevo:<servicioId>`, monto y vencimiento sin valor). Marcar pagado / cargar el monto **crea** el gasto. Es el equivalente en cliente de `generar_gastos_periodo`; con Supabase la generación real es la función SQL.

**Área "Histórico" (detalle):** **renglón compacto** con **stepper de mes** (flechas ‹ › = ±1 mes dentro del rango con datos + el texto del mes abre un **almanaque** `SelectorMes` variante `inline`) y, a la derecha, el **total gastado** en línea (rojo). Si el mes no tiene gastos, avisa. Reutiliza `PlanillasPeriodo` en modo **solo lectura**, **no colapsable** y **ocultando planillas vacías**.

**Área "Gráficos e Informes" (detalle):**
- **`GraficoEvolucion`:** debajo del filtro **Tiempo** van las pills **Todo / Planilla / Servicio** (mismo estilo que la nav). **Debajo del gráfico**, checkboxes en fila según el modo: en "Planilla" un checkbox por planilla, en "Servicio" uno por servicio, en "Todo" ninguno (línea única total). El tilde de cada checkbox toma el color de la planilla/servicio y la línea usa ese color; por defecto vienen todas tildadas.
- **Informe IA:** filtros Desde/Hasta + Alcance (`'todo' | planilla_id`). En `informe.ts` el desglose detallado es por **servicio** y el de áreas por **planilla**. Recibe SOLO agregados numéricos.

**Modales por portal:** `Modal` se renderiza con `createPortal` a `document.body` para no quedar atrapado en el contexto de apilamiento del Navbar sticky.

**Orden alfabético** en todo: planillas, servicios y filas de gasto (helper `porNombre` en `src/lib/formateo.ts`).

**Sin Storage (cambio de producto):** las facturas/documentación **no se almacenan**. El OCR lee la foto en memoria para extraer monto/vencimiento y la imagen se descarta. No hay bucket ni columna `factura_img`.

**Cambios de modelo (vigentes en `0001_init.sql`):**
- Tabla **`planillas`** + `servicios.planilla_id` + `servicios.color` + **`servicios.acumulable`** (boolean) + **`servicios.nro_cliente`**.
- **`gastos.cargas`** (jsonb, default `[]`) para servicios acumulables; el `monto` de la fila es la suma.
- Seed de 3 planillas iniciales (Auto/Inmueble/Personal); los servicios los crea cada usuario.
- `generar_gastos_periodo` arranca el mes de un acumulable **sin monto ni vencimiento**.

**Modo vista previa** (`src/lib/preview.ts`): sin credenciales de Supabase en `.env.local`, la app levanta con datos demo (`DEMO_PLANILLAS` / `DEMO_SERVICIOS` / `DEMO_GASTOS`, incluye un servicio Nafta acumulable con cargas) y las mutaciones avisan en vez de persistir. Se apaga al completar las variables. (En la demo, Luz/EDET no tiene gasto del mes actual a propósito, para mostrar una fila reiniciada.)

**Progreso por fase — las 5 fases están con el código completo** (build/lint/tsc en verde). Todo corre en **modo vista previa** porque `.env.local` está vacío (no hay proyecto Supabase ni `ANTHROPIC_API_KEY` todavía).
- **Fase 1 (Fundaciones)** y **Fase 2 (CRUD + carga manual):** ✅ código completo. ⏳ falta verificar con Supabase.
- **Fase 3 (Recurrencia + dashboard):** ✅ Mes/Histórico/gráfico hechos; `useGastos.generarPeriodo()` llama la RPC al abrir el Mes (no-op en demo). ⏳ falta correr la migración y verificar.
- **Fase 4 (OCR):** ✅ `POST /api/ocr-factura` (claude-haiku-4-5 + visión/PDF + zod), `ModalOcr` + `src/lib/ocr.ts`. ⏳ falta probar con API key real.
- **Fase 5 (Informes IA):** ✅ `POST /api/informe` (claude-sonnet-4-6), `src/lib/informe.ts`. ⏳ falta probar con API key real.

**Próximo paso al retomar — provisionar el backend real:**
1. Crear el proyecto Supabase y correr la migración `0001_init.sql` en el SQL editor (no hay CLI instalado).
2. Completar `.env.local` (URL + anon + service_role + `ANTHROPIC_API_KEY`).
3. Regenerar tipos: `supabase gen types typescript --linked > src/types/database.ts`.
4. Verificar contra datos reales: auth, RLS, CRUD de planillas/servicios/gastos, recurrencia, **acumulables/cargas**, OCR e informe.

---

## Cómo usar este documento con Claude Code

Colocá este archivo en la raíz del repositorio. No le pidas a Claude Code que implemente todo el documento de una vez: trabajá fase por fase según el plan de la sección 9, verificando cada fase antes de avanzar. En la primera sesión, pedile que lea este documento y genere un `CLAUDE.md` con las convenciones del proyecto derivadas de esta especificación.

## 1. Resumen del producto

Aplicación web multiusuario para administrar gastos fijos recurrentes, tanto de mantenimiento de vivienda (luz, gas, agua, expensas, impuestos) como personales (gimnasio, suscripciones, obra social, cuotas). Cada usuario accede con su cuenta y ve exclusivamente sus propios datos: la privacidad entre usuarios es total y se aplica a nivel de base de datos.

Funcionalidades centrales: alta/baja/edición de servicios recurrentes organizados en categorías; generación automática de los gastos de cada mes a partir de los servicios activos (recurrencia diferida, sin procesos programados); carga del gasto de forma manual o mediante fotografía/imagen de la factura procesada por IA con confirmación humana obligatoria; dashboard con estado del mes (pendientes, pagados, vencidos) y gráficos de evolución temporal con una línea de color por servicio o categoría más la línea de total, filtrables por tipo (vivienda/personal) y rango temporal; informes redactados por IA bajo demanda (mensuales, anuales, por categoría); historial completo con búsqueda y filtros; acceso directo a la plataforma de pago de cada empresa mediante URL guardada en el servicio.

Decisiones de diseño cerradas: los datos son privados por usuario (no existe espacio compartido, aunque el esquema permite agregarlo a futuro sin migración destructiva); no hay notificaciones por email ni push (el dashboard cumple esa función con los vencidos destacados); el estado "vencido" no se almacena, se deriva (gasto pendiente con vencimiento anterior a hoy); la moneda es ARS y los montos de un mismo servicio varían mes a mes, por lo que la recurrencia copia el último monto conocido como referencia marcada "a confirmar".

## 2. Stack tecnológico

| Capa                 | Tecnología                             | Rol                                                                               |
| -------------------- | -------------------------------------- | --------------------------------------------------------------------------------- |
| Frontend + backend   | Next.js 16 (App Router, TypeScript) + React 19 | UI y API routes para los endpoints de IA                                  |
| Base de datos y auth | Supabase (PostgreSQL + Auth + Storage) | Datos, autenticación por email/contraseña, almacenamiento de imágenes de facturas |
| Gráficos             | Recharts                               | Líneas de evolución temporal (pestaña Gráficos)                                   |
| Estilos              | Tailwind v4 (tokens en `globals.css`, tema oscuro) | Estilado utilitario                                                   |
| IA                   | API de Claude (Anthropic)              | OCR de facturas y redacción de informes                                           |
| Deploy               | Vercel                                 | Hosting del frontend y las API routes                                             |

El cliente conversa directamente con Supabase usando el SDK `@supabase/supabase-js` (la seguridad la garantiza Row Level Security, no el código del cliente). Las API routes de Next.js existen solo para las dos operaciones de IA, porque la clave `ANTHROPIC_API_KEY` no puede exponerse jamás en el navegador.

Documentación de referencia: API de Claude en https://docs.claude.com/en/api/overview y Claude Code en https://docs.claude.com/en/docs/claude-code/overview

## 3. Arquitectura

Tres componentes. El cliente Next.js renderiza las cinco pantallas y lee/escribe datos directamente contra Supabase con el token del usuario autenticado. Supabase provee autenticación, PostgreSQL con Row Level Security y un bucket privado de Storage para las imágenes de facturas. Las API routes del propio Next.js (`/api/ocr-factura` y `/api/informe`) corren en el servidor, reciben pedidos del cliente autenticado, llaman a la API de Claude y devuelven el resultado; son el único camino hacia la IA.

Flujo de datos cotidiano (sin IA): cliente ↔ Supabase. Flujo de carga por foto: cliente sube la imagen al bucket → llama a `/api/ocr-factura` → el servidor descarga la imagen, la envía a Claude, devuelve JSON estructurado → el cliente precarga el formulario → el usuario confirma → el cliente inserta el gasto en Supabase. Flujo de informe: cliente llama a `/api/informe` con el rango → el servidor consulta agregados en Supabase, los envía a Claude → devuelve el informe en Markdown.

## 4. Modelo de datos

> ⚠️ **Actualizado (modelo aplanado):** el DDL de abajo es el diseño original de tres niveles
> (`Tipo` fijo → `categorias` → `servicios` → `gastos`). Se **reemplazó** por un modelo de
> dos niveles: la tabla **`planillas`** (creable por el usuario: Auto, Inmueble, Personal…,
> con `nombre`, `detalle` opcional y `color`) es el nivel superior, y cada **`servicio`** cuelga
> directo de una planilla (`servicios.planilla_id`) con su `color` propio. Se eliminó el `Tipo`
> y la vieja `categorias`. El esquema vigente es `supabase/migrations/0001_init.sql`; ver CLAUDE.md.

Tres tablas propias más `auth.users` de Supabase. Toda tabla lleva `user_id` (también `gastos`, de forma denormalizada, para que las políticas RLS sean triviales y rápidas). El par servicio/gasto es la separación clave del diseño: el servicio es la definición recurrente ("EDET, luz, vence el día 10, se paga en este link") y el gasto es la instancia de un período concreto ("EDET, 2026-03, $48.300, pagado el 8/3").

```sql
-- Categorías: definidas por cada usuario, con tipo y color para los gráficos
create table categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  tipo text not null check (tipo in ('vivienda', 'personal')),
  color text not null default '#5F5E5A',
  created_at timestamptz not null default now(),
  unique (user_id, nombre)
);

-- Servicios: la plantilla recurrente de cada gasto fijo
create table servicios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  categoria_id uuid not null references categorias(id) on delete restrict,
  nombre text not null,            -- ej: "Luz"
  empresa text,                    -- proveedor, ej: "EDET"
  nro_cliente text,                -- N° de cliente/cuenta en la empresa, ej: "3712458-001"
  url_pago text,                   -- link a la plataforma de pago de la empresa
  dia_vencimiento int check (dia_vencimiento between 1 and 31),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Gastos: la instancia mensual de un servicio
create table gastos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  servicio_id uuid not null references servicios(id) on delete cascade,
  periodo text not null,           -- formato 'YYYY-MM'
  monto numeric(14,2),
  vencimiento date,
  fecha_pago date,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagado')),
  monto_confirmado boolean not null default true,  -- false cuando lo generó la recurrencia
  observacion text,
  factura_img text,                -- path dentro del bucket 'facturas'
  created_at timestamptz not null default now(),
  unique (servicio_id, periodo)    -- un solo gasto por servicio por mes
);

create index idx_gastos_user_periodo on gastos (user_id, periodo);
create index idx_gastos_servicio on gastos (servicio_id, periodo);
```

Notas de diseño: la restricción `unique (servicio_id, periodo)` es la que impide duplicar el gasto de un mes y hace idempotente la generación recurrente. El borrado de un servicio es lógico (`activo = false`) cuando tiene gastos históricos, para no perder el historial; el borrado físico solo se permite si no tiene gastos. `estado` solo admite `pendiente` y `pagado`: "vencido" se calcula en consulta como `estado = 'pendiente' and vencimiento < current_date`, lo que evita procesos que actualicen estados.

### Row Level Security

RLS activado en las tres tablas con la misma política: cada usuario solo ve y modifica sus filas. Esto hace que la privacidad no dependa del código del frontend.

```sql
alter table categorias enable row level security;
alter table servicios  enable row level security;
alter table gastos     enable row level security;

create policy "solo_propias" on categorias for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "solo_propias" on servicios for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "solo_propias" on gastos for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
```

### Storage

Bucket privado `facturas`. Convención de paths: `{user_id}/{gasto_id}.{ext}`. Política de Storage: cada usuario solo puede leer y escribir dentro de la carpeta que coincide con su `auth.uid()`. Las imágenes se sirven al cliente mediante URLs firmadas de corta duración.

### Seed de categorías iniciales

Al registrarse un usuario, un trigger sobre `auth.users` inserta categorías típicas que el usuario puede editar o borrar: Luz, Gas, Agua, Expensas e Impuestos (tipo `vivienda`, cada una con un color distinto de una paleta predefinida) y Gimnasio, Suscripciones, Obra social y Deportes (tipo `personal`). Arrancar con la app vacía es la principal causa de abandono temprano; el seed lo evita.

## 5. Lógica de negocio

### Períodos y estados

El período se representa como texto `YYYY-MM` (ej. `2026-06`), que ordena correctamente de forma lexicográfica y simplifica filtros y agrupaciones. El ciclo de vida de un gasto es: nace `pendiente` (creado a mano o por recurrencia), pasa a `pagado` cuando el usuario registra la `fecha_pago`, y la interfaz lo muestra como **vencido** (estado derivado, nunca almacenado) si sigue pendiente después del vencimiento.

### Recurrencia diferida (sin cron)

No hay procesos programados. Cuando el usuario abre la app, el cliente invoca una función RPC de Supabase que genera los gastos faltantes del período actual. La función es idempotente gracias a la restricción única, por lo que puede llamarse en cada carga de la app sin riesgo.

```sql
create or replace function generar_gastos_periodo(p_periodo text)
returns int
language plpgsql
security invoker
as $$
declare
  filas int;
begin
  insert into gastos (user_id, servicio_id, periodo, monto, vencimiento, estado, monto_confirmado)
  select
    s.user_id,
    s.id,
    p_periodo,
    -- último monto conocido del servicio, como referencia a confirmar
    (select g.monto from gastos g
      where g.servicio_id = s.id and g.monto is not null
      order by g.periodo desc limit 1),
    -- vencimiento estimado: día del servicio dentro del período pedido
    case when s.dia_vencimiento is not null
      then make_date(
        split_part(p_periodo, '-', 1)::int,
        split_part(p_periodo, '-', 2)::int,
        least(s.dia_vencimiento,
          extract(day from (date_trunc('month',
            to_date(p_periodo || '-01', 'YYYY-MM-DD'))
            + interval '1 month - 1 day'))::int))
      else null end,
    'pendiente',
    false
  from servicios s
  where s.activo
    and s.user_id = auth.uid()
    and not exists (
      select 1 from gastos g2
      where g2.servicio_id = s.id and g2.periodo = p_periodo)
  on conflict (servicio_id, periodo) do nothing;

  get diagnostics filas = row_count;
  return filas;
end;
$$;
```

Los gastos generados llevan `monto_confirmado = false` y la interfaz los distingue visualmente (monto en gris con etiqueta "a confirmar") hasta que el usuario edita o valida el monto real del mes. El `least(...)` evita fechas inválidas como el 31 de febrero.

## 6. Especificación funcional por pantalla

### 6.1 Dashboard (pantalla inicial)

Al cargar, invoca `generar_gastos_periodo` con el período actual y luego muestra: arriba, las tarjetas de resumen del mes (total pendiente, total pagado, cantidad de vencidos destacada en rojo si es mayor a cero); debajo, la lista de gastos del mes ordenada por urgencia (vencidos primero, luego pendientes por fecha de vencimiento, luego pagados), cada fila con servicio, empresa, monto, vencimiento, estado y el botón de acceso directo a la `url_pago` que abre en pestaña nueva; al pie, el gráfico de evolución.

El gráfico (Recharts, `LineChart`) muestra una línea por serie con el color de su categoría más la línea de total en color destacado. Controles: selector de granularidad de series (por servicio, por categoría, o solo totales), filtro de tipo (todo / vivienda / personal), rango temporal (últimos 6 meses por defecto; opciones 3, 6, 12 meses y personalizado). El gráfico se alimenta de los datos en vivo: cualquier alta o edición de gasto se refleja al instante sin regenerar nada.

### 6.2 Carga de gasto

Dos caminos sobre la misma pantalla. Manual: formulario con servicio (selector con los activos del usuario), período, monto, vencimiento, fecha de pago opcional, observación. Por imagen: zona de arrastre/selección de archivo que en móvil ofrece la cámara (`<input type="file" accept="image/*" capture="environment">`); al recibir la imagen, se sube al bucket, se llama a `/api/ocr-factura` y la respuesta precarga el formulario completo, marcando los campos que la IA no pudo leer. **El gasto nunca se guarda sin confirmación explícita del usuario**: el OCR de facturas argentinas (tickets térmicos, fotos borrosas) falla con la frecuencia suficiente como para que el guardado automático corrompa datos.

Si la IA detecta una empresa que no coincide con ningún servicio existente, la pantalla ofrece crear el servicio en el momento (mini-formulario embebido) en lugar de obligar a ir a otra sección.

### 6.3 Informes

El usuario elige rango (mes, trimestre, año o personalizado) y alcance (todo, un tipo, una categoría o un servicio) y pide el informe. El servidor consulta los agregados, se los pasa a la IA y devuelve un informe en Markdown que se renderiza en pantalla con opción de copiar. Los informes no se generan en tiempo real ni automáticamente: solo bajo demanda, porque cada generación tiene costo y latencia. Opcional de fase final: guardar informes generados en una tabla `informes` para reconsultarlos sin regenerar.

### 6.4 Administración de servicios

CRUD completo: tabla de servicios con nombre, empresa, categoría, día de vencimiento, link de pago y estado activo/inactivo; alta y edición en formulario; baja con la regla de borrado lógico de la sección 4. Incluye también el CRUD de categorías (nombre, tipo, color con selector).

### 6.5 Historial

Tabla paginada de todos los gastos con filtros por período, servicio, categoría, tipo y estado, búsqueda por texto en observaciones, y acceso a la imagen de factura cuando existe (URL firmada). Permite editar y eliminar gastos individuales.

## 7. Integración con IA

Dos endpoints, ambos API routes de Next.js que validan la sesión de Supabase antes de hacer nada. Modelos recomendados a la fecha de este documento: `claude-haiku-4-5` para el OCR (rápido y económico, con visión) y `claude-sonnet-4-6` para los informes (mejor redacción y análisis). Verificar modelos vigentes en https://docs.claude.com/en/docs/about-claude/models/overview antes de implementar, y fijar versiones específicas en producción.

### 7.1 POST /api/ocr-factura

Entrada: `{ "imagen_path": "uuid-usuario/uuid-gasto.jpg" }`. El servidor descarga la imagen del bucket con la service role key (validando que el path pertenezca al usuario de la sesión), la envía a la API de Claude como contenido de imagen junto con la lista de servicios activos del usuario (nombre y empresa) para que intente asociar la factura a uno existente, y exige respuesta exclusivamente en JSON con este contrato:

```json
{
  "empresa": "EDET",
  "servicio_id_sugerido": "uuid-o-null",
  "servicio_nombre_sugerido": "Luz",
  "categoria_tipo_sugerido": "vivienda",
  "monto": 48300.50,
  "vencimiento": "2026-06-10",
  "periodo": "2026-06",
  "confianza": "alta",
  "campos_dudosos": ["vencimiento"]
}
```

Todo campo ilegible viene en `null` y listado en `campos_dudosos`. El endpoint parsea el JSON con tolerancia (eliminando fences de Markdown si aparecen) y devuelve error legible si el modelo no produjo JSON válido, para que la UI ofrezca reintentar o cargar a mano.

### 7.2 POST /api/informe

Entrada: `{ "desde": "2026-01", "hasta": "2026-06", "alcance": { "tipo": null, "categoria_id": null, "servicio_id": null } }`. El servidor consulta los agregados (total por período, por categoría y por servicio, variaciones intermensuales, gastos vencidos del rango) y envía a la IA únicamente ese resumen numérico —nunca las facturas ni datos personales— con la instrucción de redactar en español un informe con: resumen ejecutivo, evolución del gasto total, los tres servicios de mayor variación con porcentajes, y observaciones accionables. Salida: Markdown.

## 8. Seguridad

La clave `ANTHROPIC_API_KEY` y la `SUPABASE_SERVICE_ROLE_KEY` viven solo en variables de entorno del servidor; el cliente conoce únicamente `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`, que son públicas por diseño porque RLS es la barrera real. Todo endpoint de IA valida la sesión y la pertenencia de los recursos referenciados. Las imágenes se sirven con URLs firmadas, nunca públicas. Validación de entrada con Zod en ambos endpoints. Límite de tamaño de imagen (5 MB) y de frecuencia razonable en los endpoints de IA para contener el costo ante errores de la UI.

## 9. Plan de desarrollo por fases (para Claude Code)

Trabajar una fase por vez y verificar su criterio de cierre antes de seguir.

**Fase 1 — Fundaciones.** Proyecto Next.js con TypeScript y Tailwind; proyecto Supabase; esquema SQL completo de la sección 4 (tablas, índices, RLS, bucket, trigger de seed); auth por email/contraseña con páginas de registro, login y recuperación. Cierre: dos usuarios registrados no pueden ver datos del otro ni siquiera consultando Supabase directamente con sus tokens.

**Fase 2 — CRUD y carga manual.** Pantallas de administración de servicios y categorías; carga manual de gastos; historial con filtros. Cierre: ciclo completo crear categoría → crear servicio → cargar gasto → editarlo → verlo en el historial.

**Fase 3 — Recurrencia y dashboard.** Función `generar_gastos_periodo` e invocación al abrir la app; dashboard con tarjetas de resumen, lista del mes por urgencia, link de pago y gráfico Recharts con todos los controles de la sección 6.1. Cierre: al cambiar de mes (simulable pasando un período futuro a la RPC) aparecen los pendientes "a confirmar" con el monto anterior.

**Fase 4 — OCR de facturas.** Subida de imagen al bucket, endpoint `/api/ocr-factura`, precarga del formulario con campos dudosos marcados, creación de servicio embebida. Cierre: una foto de factura real precarga el formulario y el gasto solo se guarda al confirmar.

**Fase 5 — Informes y pulido.** Endpoint `/api/informe`, pantalla de informes con render de Markdown, estados de carga y error consistentes en toda la app, revisión responsive móvil (la carga por foto es el caso de uso móvil principal). Cierre: informe anual generado con datos reales de al menos tres meses.

## 8. Estructura de directorios

```
iadministration/
├── CLAUDE.md                          # instrucciones para Claude Code (sesión)
├── .env.local                         # variables de entorno — nunca al repo
├── .env.example                       # plantilla de variables sin valores
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.ts                     # (Tailwind v4: sin tailwind.config.ts; tokens en globals.css @theme)
│
├── docs/
│   └── spec.md                        # este documento
│
├── supabase/
│   ├── migrations/
│   │   └── 0001_init.sql              # tablas + índices + RLS + seed + RPC (sin Storage)
│   └── config.toml
│
├── middleware.ts                      # raíz: refresca sesión y protege rutas (usa lib/supabase/middleware)
└── src/
    ├── app/                           # App Router de Next.js
    │   ├── layout.tsx                 # root layout (fuente Nunito, metadata, lang es)
    │   ├── page.tsx                   # redirige según sesión (o a /dashboard en modo vista previa)
    │   ├── (auth)/                    # grupo sin layout protegido
    │   │   ├── layout.tsx
    │   │   ├── actions.ts             # server actions de auth (login/registro/recuperar/salir)
    │   │   ├── login/page.tsx
    │   │   ├── registro/page.tsx
    │   │   ├── recuperar/page.tsx
    │   │   └── actualizar-clave/page.tsx
    │   ├── (app)/                     # grupo con layout protegido
    │   │   ├── layout.tsx             # verifica sesión + Navbar (banner si modo vista previa)
    │   │   ├── dashboard/page.tsx     # área "Mes": resumen + planillas por tipo + hub de servicios/categorías
    │   │   ├── historico/page.tsx     # área "Histórico": meses cerrados con filtro temporal (solo lectura)
    │   │   └── graficos/page.tsx      # área "Gráficos e Informes": evolución + informes IA (Fase 5)
    │   ├── auth/callback/route.ts     # callback de emails (confirmación / recuperación)
    │   ├── api/ocr-factura/route.ts   # OCR de facturas (claude-haiku-4-5)
    │   └── api/informe/route.ts       # informe IA (claude-sonnet-4-6)
    │
    ├── components/
    │   ├── Navbar.tsx
    │   ├── MenuUsuario.tsx            # avatar → "Nueva planilla" / "Salir"
    │   ├── ui/                        # Button, Input, Textarea, Label, Modal (portal a body), Badge,
    │   │                              #   Confirmacion, FormMessage, IconButton, MenuAcciones,
    │   │                              #   SelectorOpciones, SelectorMes, Toast, icons
    │   ├── dashboard/                 # ResumenCards, GrillaGastos, PlanillasPeriodo
    │   ├── graficos/                  # GraficoEvolucion
    │   ├── servicios/                 # ModalServicio, ModalPlanilla (gestión desde el Mes / menú de usuario)
    │   └── carga/                     # FormularioGasto, ModalOcr (OCR), ModalCargas (servicios acumulables)
    │
    ├── lib/
    │   ├── supabase/
    │   │   ├── client.ts              # navegador (anon key)
    │   │   ├── auth-server.ts         # servidor con cookies (anon) — auth en RSC/layouts/actions
    │   │   ├── server.ts              # service-role (solo API routes)
    │   │   └── middleware.ts          # refresco de sesión + guard de rutas
    │   ├── preview.ts                 # modo vista previa + datos demo
    │   ├── errores.ts                 # traduce errores de Postgres al español
    │   ├── formateo.ts                # moneda ARS, fechas, períodos, orden alfabético, cargas
    │   ├── ocr.ts                     # cliente OCR (Fase 4; simula en demo)
    │   └── informe.ts                 # cliente informe IA + agregados (Fase 5; simula en demo)
    │
    ├── hooks/
    │   ├── useGastos.ts
    │   ├── useServicios.ts
    │   └── usePlanillas.ts
    │
    └── types/
        ├── database.ts                # tipos (regenerar: supabase gen types typescript --linked > src/types/database.ts)
        └── modelos.ts                 # alias y tipos compuestos (joins de servicio/planilla)
```

Reglas de ubicación: todo componente que se use en más de una pantalla va en `components/ui/`; los específicos de una sola pantalla van en la subcarpeta de esa pantalla. Toda lógica que toque Supabase directamente (queries, inserts) va en los hooks de `hooks/`, no en los componentes. **Para el usuario autenticado en servidor se usa `lib/supabase/auth-server.ts`; `lib/supabase/server.ts` es el cliente service-role y solo lo importan las API routes** (ningún componente).

## 9. Plan de desarrollo por fases (para Claude Code)

Trabajar una fase por vez y verificar su criterio de cierre antes de seguir.

**Fase 1 — Fundaciones.** Proyecto Next.js con TypeScript y Tailwind; proyecto Supabase; esquema SQL completo de la sección 4 (tablas, índices, RLS, bucket, trigger de seed); auth por email/contraseña con páginas de registro, login y recuperación. Cierre: dos usuarios registrados no pueden ver datos del otro ni siquiera consultando Supabase directamente con sus tokens.

**Fase 2 — CRUD y carga manual.** Pantallas de administración de servicios y categorías; carga manual de gastos; historial con filtros. Cierre: ciclo completo crear categoría → crear servicio → cargar gasto → editarlo → verlo en el historial.

**Fase 3 — Recurrencia y dashboard.** Función `generar_gastos_periodo` e invocación al abrir la app; dashboard con tarjetas de resumen, lista del mes por urgencia, link de pago y gráfico Recharts con todos los controles de la sección 6.1. Cierre: al cambiar de mes (simulable pasando un período futuro a la RPC) aparecen los pendientes "a confirmar" con el monto anterior.

**Fase 4 — OCR de facturas.** Subida de imagen al bucket, endpoint `/api/ocr-factura`, precarga del formulario con campos dudosos marcados, creación de servicio embebida. Cierre: una foto de factura real precarga el formulario y el gasto solo se guarda al confirmar.

**Fase 5 — Informes y pulido.** Endpoint `/api/informe`, pantalla de informes con render de Markdown, estados de carga y error consistentes en toda la app, revisión responsive móvil (la carga por foto es el caso de uso móvil principal). Cierre: informe anual generado con datos reales de al menos tres meses.

## 10. Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # solo servidor
ANTHROPIC_API_KEY=              # solo servidor
```

## 11. Fuera de alcance (decidido, no olvidado)

Notificaciones por email o push; espacio de gastos compartidos entre usuarios (el esquema lo admite a futuro agregando una tabla de grupos y una FK opcional, sin migración destructiva); multi-moneda; presupuestos y metas de ahorro; importación bancaria automática.
