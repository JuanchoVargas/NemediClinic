# NemediClinic — Mapa de flujos ejecutado

Fecha: 2026-09-15. Ejecutado contra la API local (`localhost:5055`, Development) y el frontend Vite (`localhost:5173`) con los datos de `POST /api/v1/dev/seed-demo`.

**Cómo se ejecutó.** Cada flujo se corrió con scripts de Node (sin librerías): llamadas HTTP con el JWT real obtenido por `POST /auth/login`, y para la parte de interfaz Chrome headless controlado por Chrome DevTools Protocol (navegación, clicks, formularios, lectura del DOM y capturas). Se hicieron cuatro pasadas: la primera por API, la segunda y tercera por navegador, y una cuarta para repetir los pasos que fallaron por limitaciones del propio harness (los tabs de Radix se activan con `mousedown`, no con `click`; el botón "Ingresar" del header capturaba el submit del login). Solo se reporta lo que se ejecutó; lo que no se pudo ejecutar dice "no ejecutado" y por qué.

**Leyenda.** ✅ funciona · ⚠️ funciona con limitación · ❌ no existe o falla · ⏭️ no ejecutado. La columna "Bloqueante" dice si impide una demo guiada de una hora con un solo tenant.

**Tres bugs se corrigieron durante esta sesión** porque bloqueaban varios flujos; se indican en cada paso como "corregido hoy" y quedaron en commits separados:

| Commit | Bug | Efecto antes del fix |
|---|---|---|
| `dc64e2b` | Citas convertidas a UTC entre frontend y backend | Una cita creada a las 09:00 se mostraba a las 14:00 |
| `bc4ead6` | Filtro global de tenant fijado al tenant de la primera request del proceso | Un JWT de otro tenant veía todos los datos del primero (F03) |
| `be5a5d1` | La API solo aceptaba enums como entero y el frontend envía nombres | 400 al cambiar estado de cita, registrar pago, crear producto y registrar entrada |

> **Actualización 2026-09-18.** Las tablas F01–F17 de abajo son la foto del 2026-09-15 y se conservan como histórico. Lo que cambió desde entonces (bugs cerrados, flujos nuevos F18–F22 y lo que sigue abierto) está en la sección **"Estado al 2026-09-18"**, al final. Desde el 2026-09-16 los flujos ya no se ejecutan con scripts sueltos sino con Playwright: `pnpm test` (aislamiento multi-tenant, gate de push), `pnpm test:ui` (recorrido por rol con capturas) y `pnpm test:mobile` (responsive a 390 px).

---

## F01 · Autenticación

| Paso | Esperado | Real | Estado |
|---|---|---|---|
| Login SuperAdmin (API y formulario) | 200, rol SuperAdmin, redirige a `/dashboard` | 200; `/dashboard`; header con email y menú Administración | ✅ |
| Login Esteticista (API y formulario) | 200, rol Esteticista, sin menú Administración | 200; `/dashboard`; sin Administración | ✅ |
| Login con clave errada | 401 `{error}` y aviso en pantalla | 401 "Credenciales inválidas."; toast e inline | ✅ |
| Logout | Vuelve a `/login` y borra el token | `/login`, `auth-storage.token = null` | ✅ |
| `/patients` sin sesión | Redirige a `/login` | `/login` | ✅ |
| `GET /patients` sin token | 401 | 401 | ✅ |
| Esteticista entra a `/super/tenants` | Redirige a `/dashboard` con toast | `/dashboard`; el toast no se capturó (desaparece antes de 2 s) | ✅ |
| Esteticista `GET /tenants` | 403 | 403 | ✅ |
| Esteticista `GET /users` | Debería limitarse a nombres para el selector | 200 con emails de todos los usuarios (`[Authorize]` sin policy) | ⚠️ |

Bloqueante: no.

## F02 · Administración

| Paso | Esperado | Real | Estado |
|---|---|---|---|
| SuperAdmin crea usuario Admin (`auth/register`, rol 1) | 201 | 201; login del Admin OK con rol Admin | ✅ |
| Admin intenta crear usuario | La UI lo permite (`requireRoles(["SuperAdmin","Admin"])`) | Backend responde 403: solo SuperAdmin | ⚠️ |
| SuperAdmin crea sede | 201 | 201 | ✅ |
| Admin intenta crear sede | 403 | 403 | ✅ |
| SuperAdmin crea tenant | 201 | 201 | ✅ |
| `/admin/users` | Lista con Sheet "Nuevo usuario" (nombre, email, rol, sede) | 3 usuarios; Sheet correcto | ✅ |
| `/admin/branches` | Lista sedes | 1 sede "Sede Principal" | ✅ |
| `/super/tenants` | Lista tenants | 1 tenant | ✅ |
| Eliminar usuario / sede / tenant de prueba (soft) | 204 | 204 / 204 / 204 | ✅ |

Bloqueante: no. Para la demo, crear usuarios solo con el SuperAdmin.

## F03 · Aislamiento multi-tenant (crítico)

| Paso | Esperado | Real | Estado |
|---|---|---|---|
| Crear segundo tenant por API | 201 | 201 | ✅ |
| Crear el SuperAdmin del segundo tenant por API | Usuario con `tenantId` del tenant 2 | **No existe forma**: `auth/register` siempre usa el `tenant_id` del JWT del SuperAdmin autenticado; el usuario quedó en el tenant 1 | ❌ |
| Verificación con usuario real del tenant 2 | 0 pacientes / 0 citas / 0 productos | No ejecutable por el punto anterior | ⏭️ |
| Verificación con JWT firmado con la clave de desarrollo para el tenant 3 (`tenant_id` = tenant nuevo) — **antes del fix** | 0 / 0 / 0 / 0 / 0 | **8 pacientes, 14 citas, 7 productos, 4 usuarios** del tenant 1; `GET /patients/{id}` de Valentina → 200; historia clínica → 200 | ❌ |
| Diagnóstico | — | Reiniciando la API y haciendo la primera request con un tenant inexistente, el tenant 1 real pasó a ver **0 pacientes**: el filtro quedaba fijado al tenant de la primera request del proceso (`Expression.Constant(_tenantProvider)` en un modelo que EF cachea una vez) | ❌ |
| Misma verificación **después del fix** `bc4ead6` | 0 / 0 / 0 / 0 / 0 | 0 pacientes, 0 citas, 0 productos, 0 usuarios, 0 paquetes; `GET /patients/{id}` ajeno → 404; historia ajena → 404 | ✅ corregido hoy |
| Tenant 3 crea paciente con la misma cédula que Valentina | 201 (unicidad por tenant) | 201 | ✅ |
| Tenant 1 no ve el paciente del tenant 3 | 0 resultados | 0 | ✅ |
| Orden de requests tras el fix (proceso nuevo, primera request de tenant ajeno) | Tenant 1 sigue viendo sus 8 pacientes | 8 | ✅ |
| JWT válido sin claim `tenant_id` | 403 | 403 (`TenantMiddleware`) | ✅ |
| Login de un usuario cuyo tenant fue eliminado (soft) | 401 | 200: el login ignora `IsDeleted`/`IsActive` del tenant | ⚠️ |

Bloqueante para demo de un solo tenant: no (ya corregido). Bloqueante para vender multi-tenant: ya no — desde el 2026-09-18 el PlatformAdmin crea el tenant y su primer SuperAdmin (`POST /api/v1/platform/tenants` + `/{id}/bootstrap-admin`), y el gate `tests/e2e/tenant-isolation.spec.ts` crea sus tenants por ese camino.

## F04 · Pacientes

| Paso | Esperado | Real | Estado |
|---|---|---|---|
| Crear paciente (API) | 201 + historia clínica automática | 201; `GET clinical-record` 200 | ✅ |
| Cédula duplicada | 409 | 409 "Ya existe un paciente con esa cédula en este tenant." | ✅ |
| Buscar por nombre (API y UI) | 1 resultado | "valentina" → 1; "Juliana" en la UI → 1 fila | ✅ |
| Buscar por cédula (API y UI) | 1 resultado | 1000000003 → Juliana; 1000000007 en la UI → Carolina | ✅ |
| Editar (API y `/patients/:id/edit`) | Persiste; el formulario carga los datos | Teléfono actualizado; input precargado con 3001234501 | ✅ |
| Detalle con 4 tabs | Información, Historia clínica, Paquetes, Pagos | 4 tabs; cada una renderiza (datos personales; antecedentes; "Rostro Radiante 2 / 5 sesiones"; pagos 320.000 + 300.000) | ✅ |
| Eliminar (API y botón en la lista) | 204, GET 404, desaparece de la búsqueda; botón "Eliminar a …" visible | 204 / 404 / 0 resultados; botones presentes | ✅ |
| Columna "Próxima cita" | Fecha de la próxima cita | La tabla actual no muestra la columna; el DTO trae `proximaCita = null` siempre | ⚠️ |
| Citas de un paciente eliminado | No aparecen en hoja del día | 0 (el join con Patient las oculta) | ✅ |

Bloqueante: no.

## F05 · Historia clínica

| Paso | Esperado | Real | Estado |
|---|---|---|---|
| Leer historia (tab) | Antecedentes, alergias, medicamentos, notas | Muestra "Rosácea leve…", "níquel…", y la nota "…enrojecimiento…" del seed | ✅ |
| Editar antecedentes/alergias | Formulario en la UI | **Solo por API** (`PUT …/clinical-record` → 204 y persiste). La UI no tiene botón de edición: únicamente "Anterior / Siguiente" de la paginación de notas | ⚠️ |
| Crear nota de evolución | Formulario en la UI | **Solo por API** (`POST …/notes` → 201, `fechaCreacion` en hora local). La UI no crea notas | ⚠️ |

Bloqueante: sí si la demo incluye "registrar la evolución de la sesión". Se puede mostrar la lectura con los datos del seed.

## F06 · Procedimientos

| Paso | Esperado | Real | Estado |
|---|---|---|---|
| Crear / editar (API y Sheet) | 201 / 204 | 201; precio y duración persisten | ✅ |
| Esteticista intenta crear | 403 | 403 | ✅ |
| Desactivar | Badge "Inactivo" en la lista | La lista lo muestra con badge "Inactivo" | ✅ |
| Select de procedimiento en "Nueva cita" | Excluye inactivos | **Incluye el inactivo** (7 opciones con "ZZ Inactivo F06"); el API no filtra y `CalendarPage` no aplica `p.activo` | ❌ |
| Formulario de paquete | Excluye inactivos | No aparece (`PackageFormPage` filtra `p.activo`) | ✅ |
| Eliminar (soft) | 204 | 204 | ✅ |

Bloqueante: no. Evitar desactivar procedimientos en vivo.

## F07 · Paquetes (catálogo)

| Paso | Esperado | Real | Estado |
|---|---|---|---|
| Crear con 2 procedimientos | 201 + 2 procedimientos en el detalle | 201; `procedimientos.length = 2` | ✅ |
| Precio de referencia y descuento | Visible en el formulario | El formulario dice "las sesiones totales y el precio de referencia se calculan automáticamente"; el DTO del API no trae `precioReferencia` ni `descuento` (se calcula en el cliente) | ✅ |
| Editar precio/vigencia | Persiste | 290.000 / 90 días | ✅ |
| Quitar un procedimiento del paquete | Endpoint DELETE | **No existe** (404); solo se pueden agregar | ⚠️ |
| Eliminar paquete (soft) | 204 y GET 404 | 204 / 404 | ✅ |
| Paquete asignado a un paciente después de eliminar el catálogo | Sigue consultable o el borrado se bloquea | **`GET /patient-packages/{id}` → 404**: el filtro global oculta el `Package` y la relación requerida elimina la asignación de la consulta. Datos del paciente (sesiones, pagos) quedan inaccesibles | ❌ |

Bloqueante: no, mientras no se borre un paquete con asignaciones durante la demo.

## F08 · Asignar paquete a paciente

| Paso | Esperado | Real | Estado |
|---|---|---|---|
| Botón "Asignar a paciente" en el detalle del paquete | Existe y abre Sheet con paciente, precio y fecha | Existe; Sheet con combobox de paciente, precio y fecha | ✅ |
| Asignar (API) | 201 y sesiones generadas | 201; 2 sesiones "Pendiente" (1 por procedimiento) para el paquete de prueba | ✅ |
| Ficha del paciente muestra progreso 0/N | "0 / 5 sesiones", saldo | Sara: "Rostro Radiante · Activo · Progreso 0 / 5 sesiones · Total pagado $0" | ✅ |
| Esteticista intenta asignar | 403 | 403 | ✅ |

Bloqueante: no.

## F09 · Pagos

| Paso | Esperado | Real | Estado |
|---|---|---|---|
| Registrar pago parcial desde la UI (`metodoPago: "Efectivo"`) — antes del fix | 201 | **400** "The request field is required" (enum como string) | ❌ → ✅ corregido hoy |
| Registrar pago parcial desde la UI — después de `be5a5d1` | Toast y saldo 520.000 | Toast "Pago registrado"; saldo 520.000 visible en la ficha | ✅ |
| Segundo pago: monto prellenado con el saldo | 520.000 | 520.000 | ✅ |
| Pago total → saldo 0 en verde | Saldo $0 con fondo verde | Saldo 0; clases `bg-green-50 text-green-800` | ✅ |
| Pago por encima del saldo (API) | 400 | **201**: acepta sobrepago y el saldo queda negativo | ⚠️ |

Bloqueante: no (tras el fix).

## F10 · Calendario

| Paso | Esperado | Real | Estado |
|---|---|---|---|
| Vistas semana / día / mes | Renderizan eventos | 12 / 4 / 12 eventos con títulos "14 – 20 sept 2026", "15 de septiembre de 2026", "septiembre de 2026" | ✅ |
| Seleccionar slot vacío (jueves 18:00) | Sheet con `datetime-local = 2026-09-17T18:00` | Correcto | ✅ |
| Crear la cita desde el Sheet (paciente por combobox, procedimiento, esteticista) | 201 y `fechaInicio` termina en `T18:00:00` | Toast "Cita creada"; API devuelve `2026-09-17T18:00:00`; el calendario la pinta "18:00 - 18:45" | ✅ (tras `dc64e2b`) |
| Cita por API a las 09:00 | GET 09:00 y calendario 09:00 | `2026-09-18T09:00:00`; evento "9:00 - 10:00" | ✅ |
| Cliente que envía sufijo Z | Se convierte a hora local | `19:00Z` → guardado `14:00` local | ✅ |
| Requests del calendario | `start`/`end` sin Z | `start=2026-09-14T00:00:00&end=2026-09-21T00:00:00` | ✅ |
| Conflicto de horario (misma esteticista, solapado) | 409 | 409 "El esteticista ya tiene una cita en ese horario." | ✅ |
| Filtro por esteticista (Camila) | Solo sus citas | 6 por API; en la UI desaparecen las de Santiago y Mariana (solo Laura) | ✅ |
| Esteticista (Laura) solo ve las suyas | API y calendario limitados; combobox oculto | API: 9 citas, todas propias; UI: 7 eventos = exactamente lo que el API le devuelve; sin combobox | ✅ |
| Hoja del día incluye la cita nueva | Sí | Sí | ✅ |

Bloqueante: no.

## F11 · Ciclo de una cita

| Paso | Esperado | Real | Estado |
|---|---|---|---|
| Agendada → Confirmada → EnCurso → Completada (API, enteros) | 204 ×3 | 204 ×3; estado Completada | ✅ |
| Mismo ciclo desde el Sheet del calendario — antes del fix | Cambia de estado | **400** en "Confirmar" (el frontend envía `"Confirmada"`) | ❌ → ✅ corregido hoy |
| Mismo ciclo desde el Sheet — después de `be5a5d1` | Botones Confirmar → Iniciar → Completar; toasts | "Cita marcada como Confirmada / En curso / Completada"; el evento pasa a gris `rgb(107,114,128)` | ✅ |
| Cancelar desde el Sheet | Estado Cancelada | Cancelada (sin diálogo de confirmación intermedio) | ✅ |
| Al completar una cita ligada a sesión: sesión Completada y `SesionesCompletadas` sube | Sesión Completada, 1/2 | Sesión "Completada" con `fechaCompletada`; 1/2. Desde la UI (Mariana, Piernas Láser): 1→2 de 4 | ✅ |
| Completar dos veces no duplica | Sigue 1/2 | 1/2 | ✅ |
| Al completar todas las sesiones el paquete pasa a Completado | Estado Completado, 2/2 | **Estado Activo con 2/2**: `AppointmentsController.UpdateStatus` no cierra el paquete (el endpoint manual `sessions/{id}/complete` sí lo hace) | ❌ |
| Cambiar estado del paquete manualmente | Botón en la UI | Solo por API (`PUT /patient-packages/{id}/status` → Completado) | ⚠️ |
| Eliminar cita Completada | 400 | 400 "Solo se pueden eliminar citas Agendada o Confirmada." | ✅ |
| Eliminar cita Agendada | 204 y GET 404 | 204 / 404 | ✅ |
| Esteticista cambia estado de una cita ajena | 403 | 403 | ✅ |

Bloqueante: no (tras el fix). En la demo, no prometer que el paquete se cierra solo.

## F12 · Hoja del día

| Paso | Esperado | Real | Estado |
|---|---|---|---|
| Hoy: orden cronológico y badges | 08:00 → 15:00; Completada / Confirmada / Agendada | 08:00 a. m., 10:00 a. m., 11:00 a. m., 03:00 p. m.; badges Completada, Confirmada, Confirmada, Agendada | ✅ |
| Cambiar fecha con el input | Título cambia; ayer muestra Completada / Cancelada / No confirmó | "Lunes, 14 De Septiembre De 2026"; 09:00, 11:00, 14:00, 16:00; badges Completada, Completada, Cancelada, No confirmó | ✅ |
| Botones ‹ Hoy › | Accesibles | Las flechas no tienen `aria-label` (solo icono) | ⚠️ |
| Título con mayúsculas "De Septiembre De" | "15 de septiembre de 2026" | Capitaliza cada palabra (estético) | ⚠️ |

Bloqueante: no.

## F13 · Inventario

| Paso | Esperado | Real | Estado |
|---|---|---|---|
| Tab Productos | 6 productos con semáforo | 6 filas | ✅ |
| Crear producto desde la UI — antes del fix | 201 | **400** (`tipoProducto` como string) | ❌ → ✅ corregido hoy |
| Crear producto desde la UI — después | Toast; semáforo Rojo con stock 0 | "Producto creado"; fila "0 / mín 0 · Rojo" | ✅ |
| Semáforo inicial (API, mínimo 10) | Rojo | Rojo | ✅ |
| Registrar entrada — antes del fix | 201 | **400** (`motivoEntrada` como string) | ❌ → ✅ corregido hoy |
| Registrar entrada de 7 (mín 10) | Amarillo | Amarillo, stock 7 | ✅ |
| Segunda entrada (12 ≥ 10) | Verde | Verde | ✅ |
| Tab Alertas | 4 tarjetas (2 críticas, 2 bajas) con "Registrar entrada" | 4 tarjetas: Mascarilla y Guantes (Crítico), Aceite y Ácido (Bajo) | ✅ |
| Entrada desde la tarjeta de alerta | Sheet con el producto preseleccionado | "Producto: Producto Alerta F13 (F13-ALR)"; entrada de 25 → "Entrada registrada"; stock 25, Verde; desaparece de Alertas | ✅ |
| Tab Entradas | Historial con la entrada nueva de primero | 7 filas; primera "Producto Alerta F13 · 25 unidad · Compra · 15/9/2026 · Juan Diego Vargas" | ✅ |
| Entrada con cantidad 0 | 400 | 400 | ✅ |
| Historial de movimientos por producto | Vista en la UI | **No existe en la UI** y `GET /inventory/movements/product/{id}` responde **500** (`NullReferenceException` en `MapToDto`: `m.Product` no se incluye) | ❌ |

Bloqueante: no (tras los fixes). No abrir "movimientos" en la demo.

## F14 · Consumo de cabina

| Paso | Esperado | Real | Estado |
|---|---|---|---|
| Completar dos citas (F11) y revisar movimientos | ≥1 movimiento `Salida` ligado a la cita | **0 salidas**. Ninguna ruta genera `MovementType.Salida`; `ClinicalNote.ProductosUsados` es texto libre sin relación con `Product` | ❌ no existe |

Bloqueante: solo si se promete descuento automático. Presentarlo como pendiente.

## F15 · Vencimiento de paquetes

| Paso | Esperado | Real | Estado |
|---|---|---|---|
| Asignar paquete con `FechaInicio` hace 400 días (vigencia 90) | Estado Vencido o alerta | Estado **Activo**; el DTO no expone `vigenciaDias`; nada evalúa `VigenciaDias` ni `DiasAlertaVencimiento` (sin job ni cálculo en lectura) | ❌ no existe |
| Marcar Vencido por API | Estado Vencido | Vencido (solo manual, sin UI) | ⚠️ |

Bloqueante: no. El KPI "Paquetes por vencer" del dashboard no tiene de dónde salir.

## F16 · Dashboard

| Paso | Esperado | Real | Estado |
|---|---|---|---|
| `GET /api/v1/dashboard` | KPIs | 404: no existe | ❌ |
| `/dashboard` | Citas hoy, pacientes activos, ingresos del mes, paquetes por vencer | 4 tarjetas con "—" y "Sin endpoint aún" | ❌ |

Bloqueante: sí para la primera impresión. Recomendación: entrar por Calendario u Hoja del día, no por Dashboard.

## F17 · Sesión

| Paso | Esperado | Real | Estado |
|---|---|---|---|
| Vigencia del JWT en Development | 480 min | El claim `exp` está a 480 min. El campo `expiration` del login dice 60 min porque `AuthController` lo calcula con `DateTime.UtcNow.AddHours(1)` fijo (informativo, nadie lo usa) | ⚠️ |
| JWT expirado en `localStorage` al navegar | Guard redirige a `/login` | `/login` | ✅ |
| Request con JWT inválido (API) | 401 | 401 | ✅ |
| 401 durante la sesión (JWT con firma inválida pero `exp` válido) | Sesión limpia y redirección | Toast "Request failed with status code 401", la página queda vacía, **el token no se borra** y no redirige: el primer interceptor convierte el error a `ApiError` y el segundo (que limpia la sesión) busca `error.response.status`, que ya no existe | ❌ |
| `POST /auth/refresh` | Nuevo par de tokens | 200 en la API; **el frontend descarta el `refreshToken`** y nunca lo llama | ⚠️ |

Bloqueante: no con 480 min de sesión. Sí si la demo se deja abierta de un día para otro.

---

## Resumen

| Flujo | Estado | Bloqueante para demo | Nota |
|---|---|---|---|
| F01 Auth | ✅ | No | Esteticista puede listar emails de usuarios |
| F02 Admin | ⚠️ | No | Admin no puede crear usuarios aunque la UI lo permita |
| F03 Multi-tenant | ✅ tras fix | No (1 tenant) / Sí (multi) | Filtro corregido; onboarding resuelto el 2026-09-18 con el nivel de plataforma |
| F04 Pacientes | ✅ | No | `proximaCita` nunca se calcula |
| F05 Historia clínica | ⚠️ | Sí si se quiere escribir en vivo | UI solo lectura; API completa |
| F06 Procedimientos | ⚠️ | No | Select de "Nueva cita" muestra inactivos |
| F07 Paquetes | ⚠️ | No | Borrar catálogo con asignaciones las deja inaccesibles |
| F08 Asignar paquete | ✅ | No | |
| F09 Pagos | ✅ tras fix | No | Acepta sobrepago |
| F10 Calendario | ✅ tras fix | No | Horas correctas, conflicto 409, filtros por rol |
| F11 Ciclo de cita | ⚠️ tras fix | No | No cierra el paquete al completar la última sesión |
| F12 Hoja del día | ✅ | No | Flechas sin aria-label |
| F13 Inventario | ✅ tras fix | No | Sin historial de movimientos (endpoint 500) |
| F14 Consumo de cabina | ✅ desde el 2026-09-18 | No | La nota clínica descuenta inventario |
| F15 Vencimiento | ❌ | No | No existe |
| F16 Dashboard | ❌ | Sí (primera pantalla) | Placeholder |
| F17 Sesión | ⚠️ | No | 480 min; 401 mal manejado; sin refresh |

Estado de los datos demo tras la ejecución: los registros de prueba (paciente 1000000099, procedimientos, paquete, producto, usuarios, sedes y tenants de prueba) fueron eliminados con soft delete. Quedan tres cambios respecto al seed original: Sara Hernández tiene asignado "Rostro Radiante" pagado en su totalidad (0/5 sesiones), la cita de Mariana de hoy 10:00 está Completada (sesión 2/4 de Piernas Láser) y Santiago tiene una cita Completada el 17/09 a las 18:00. Para volver al estado exacto del seed: borrar la base y ejecutar `auth/seed` + `dev/seed-demo`.

## Bugs encontrados, priorizados

### Críticos

1. **Filtro de tenant fijado al primer request del proceso** (`AppDbContext.BuildFilterExpression`). Cualquier tenant veía los datos del primero que consultó tras el arranque. **Corregido hoy** (`bc4ead6`). Falta un test de integración que arranque la API con un tenant y consulte con otro.
2. **La API rechazaba enums por nombre** y el frontend los envía así: cambiar estado de cita, registrar pago, crear producto y registrar entrada devolvían 400. **Corregido hoy** (`be5a5d1`).
3. **Citas corridas 5 horas** por conversión UTC en un solo sentido. **Corregido hoy** (`dc64e2b`).
4. ✅ **Resuelto el 2026-09-18 (nivel de plataforma: `/platform` → Nuevo tenant → Crear admin).** ~~No hay forma de crear el SuperAdmin de un tenant nuevo.~~ `auth/register` toma el tenant del JWT; `auth/seed` solo funciona con la base vacía. Sin esto el producto no es multi-tenant operativamente.

### Altos

5. ✅ **Resuelto el 2026-09-18 (`7ba8804`): la asignación guarda su copia del catálogo (nombre, sesiones, vigencia).** ~~Borrar un paquete del catálogo deja inaccesibles sus asignaciones~~ (`GET /patient-packages/{id}` → 404 por el filtro global sobre la relación requerida). Bloquear el borrado si hay asignaciones o proyectar sin depender del filtro.
6. ✅ **Resuelto el 2026-09-18 (`b019ced`, `PatientPackageService.CompleteSessionAsync` compartido).** ~~Completar la última sesión desde una cita no cierra el paquete~~ (`AppointmentsController.UpdateStatus` no replica la regla de `PatientPackagesController.CompleteSession`). Mover la regla a un servicio compartido.
7. ✅ **Resuelto (interceptor único: limpia la sesión, avisa y va a `/login?redirect=`).** ~~401 en mitad de la sesión no limpia ni redirige.~~ El segundo interceptor de `axios.ts` recibe un `ApiError` sin `response`. Unificar en un solo interceptor y redirigir a `/login`.
8. ✅ **Resuelto el 2026-09-18 (`b019ced`; también el listado paginado) y con pestaña "Movimientos" en Inventario.** ~~`GET /inventory/movements/product/{id}` responde 500~~ (`m.Product` sin `Include` en `MapToDto`).
9. ✅ **Resuelto el 2026-09-18 (`d621b98` notas con fotos, `b019ced` edición de antecedentes y nota desde la cita Completada).** ~~Historia clínica solo lectura en la UI~~ aunque la API soporta editar antecedentes y crear notas.
10. ✅ **Resuelto el 2026-09-18 (`7ba8804`): login y refresh rechazan tenants eliminados, inactivos o suspendidos con mensaje legible.** ~~Login acepta usuarios de tenants eliminados o inactivos.~~

### Medios

11. ✅ Resuelto (`7ba8804`): recepción crea **esteticistas**; los demás roles siguen siendo del dueño, y la UI lo refleja. ~~Admin no puede crear usuarios.~~
12. ✅ Resuelto (`b019ced`). ~~Select de procedimiento en "Nueva cita" muestra inactivos.~~
13. ✅ Resuelto (`9dced81`): un pago mayor al saldo responde 422. ~~Pagos aceptan sobrepago (saldo negativo).~~
14. ✅ Resuelto (`d621b98`: `PatientDto.ProximaCita`). ~~`proximaCita` nunca se calcula.~~
15. ✅ Resuelto (`7ba8804`): `DELETE /packages/{id}/procedures/{procedureId}`, solo en paquetes sin asignaciones y nunca el último. ~~No existe endpoint para quitar un procedimiento de un paquete.~~
16. ✅ Resuelto del todo: el vencimiento desde `b019ced` y el **consumo de cabina (F14) desde `7ba8804`**.
17. ✅ Resuelto (`b019ced`: `GET /api/v1/dashboard` + gráficas). ~~Dashboard sin endpoint (F16).~~
18. `LoginResponse.expiration` informa 60 min aunque el JWT dure 480.
19. El frontend descarta el `refreshToken`.

### Bajos

20. Esteticista puede listar todos los usuarios con email.
21. ✅ Resuelto (`bdbf2d4`). ~~Flechas de navegación de la hoja del día sin `aria-label`; título con capitalización por palabra.~~
22. ✅ Resuelto (`7ba8804`): `PackageProcedure` hereda de `BaseEntity` con `TenantId`, así que ya tiene el mismo filtro global. (Queda la misma advertencia para `ValuationProcedure`, que no afecta datos vendidos.)

---

## Estado al 2026-09-18

Cinco commits cerraron la mayor parte de lo anterior y agregaron cinco flujos. Todos se verificaron con los cuatro checks en 0 (`dotnet build`, `pnpm build`, `pnpm lint`, `pnpm test`) al cerrar cada uno.

| Commit | Contenido |
|---|---|
| `2aaef5c` | Nivel de plataforma: PlatformAdmin, canales, oportunidades, liquidación, marca por dominio, 423 por mora |
| `d621b98` | Adjuntos de imagen (URLs firmadas, Evolución Antes/Después) + rediseño visual completo |
| `b019ced` | Dashboard real, cierre y vencimiento de paquetes, historia clínica editable, los ❌ del recorrido |
| `c1659f3` | Contraseñas: cambio obligatorio, `change-password`, restablecimiento con clave temporal |
| `a7fb14f` | Valoraciones (embudo y conversión) + consentimiento informado firmado en PDF |
| `bdbf2d4` | Responsive a 390 px + PWA con la marca del canal |
| `9dced81` | Pagos con trazabilidad: comprobante, referencia, quién lo registró, tope en el saldo |
| `9073d29` | Dashboard con alternadores (citas/dinero, procedimientos/productos) |
| `7ba8804` | Consumo de cabina + copia del catálogo en el paquete vendido + bugs altos |

### Qué pasó con cada flujo

| Flujo | Antes (09-15) | Ahora | Cómo se verifica |
|---|---|---|---|
| F03 Multi-tenant | ✅ tras fix, sin onboarding | ✅ El PlatformAdmin crea tenant + primer SuperAdmin; el PlatformAdmin recibe 403 en datos de clínica; los adjuntos de otro tenant dan 404 | `pnpm test` (gate de push) |
| F04 Pacientes | ⚠️ `proximaCita` nula | ✅ Próxima cita calculada; foto de perfil con iniciales de respaldo | recorrido admin cap. 2 |
| F05 Historia clínica | ⚠️ solo lectura | ✅ Editar antecedentes, nota con fotos Antes/Después, nota desde la cita Completada (queda ligada a la sesión del paquete), pestaña Evolución con comparador | recorrido esteticista cap. 4 |
| F06 Procedimientos | ⚠️ inactivos en "Nueva cita" | ✅ Filtrados; switch Activo; tarjetas con imagen; "Requiere consentimiento" | recorrido superadmin |
| F08/F09 Paquete y pagos | ✅ | ✅ + eliminar asignación y eliminar pago (soft, Admin) | API + ficha del paciente |
| F11 Ciclo de cita | ⚠️ no cerraba el paquete | ✅ Cierra el paquete al completar la última sesión; 409 `consent_required` si falta el consentimiento | recorrido esteticista |
| F12 Hoja del día | ⚠️ aria-label y título | ✅ Corregidos; diseño de tablet a 2 columnas; disponible sin conexión (24 h) | `pnpm test:mobile` + verificación offline manual |
| F13 Inventario | ❌ movimientos 500 | ✅ Pestaña Movimientos | recorrido admin cap. 5 |
| F15 Vencimiento | ❌ no existía | ✅ Job Hangfire 02:00 (`paquetes-vencimiento`), `PorVencer`/`DiasParaVencer` en el DTO, alerta en el dashboard. En Development se fuerza con `POST /dev/run-package-expiration` | API |
| F16 Dashboard | ❌ placeholder | ✅ 8 indicadores, sparklines, área 14 días, top 5 procedimientos, alertas con enlace, filtro de sede para el dueño | recorrido superadmin cap. 1 |
| F17 Sesión | ⚠️ 401 mal manejado | ✅ 401 limpia sesión y redirige. El refresh token sigue sin usarse | — |
| F14 Consumo de cabina | ❌ no existía | ✅ La nota clínica declara (producto, cantidad); al guardarla sobre una cita Completada se crea la **Salida** con cita y paciente y baja el stock (400 si no alcanza, aviso si queda bajo el mínimo) | `pnpm test` |

### Flujos nuevos

| Flujo | Pasos verificados | Estado |
|---|---|---|
| **F18 · Plataforma** | Login PlatformAdmin → `/platform`; crear tenant; "Crear admin" muestra la clave temporal una sola vez; canales (Nemedi no se borra); oportunidad con NIT protegido 90 días (409 si lo tiene otro canal); activar oportunidad crea el tenant; liquidación por mes con CSV; tenant Suspendido → 423 en escrituras y banner | ✅ |
| **F19 · Contraseñas** | Usuario nuevo entra con clave temporal → solo puede ver `/change-password` (la API responde 403 `password_change_required` al resto) → cambia la clave (mín. 8, letra y número) → se invalidan los refresh tokens; restablecer desde Usuarios (SuperAdmin/Admin) y desde Plataforma; correo solo si hay `Smtp:*` configurado | ✅ (el correo no se probó contra un SMTP real) |
| **F20 · Valoraciones** | Crear valoración de un prospecto sin cédula; fotos "Antes"; Rechazar con motivo; Convertir (Admin) crea el paciente si hace falta, asigna el paquete y mueve las fotos a la ficha; embudo y tasa de conversión | ✅ |
| **F21 · Consentimiento** | Plantilla por procedimiento con `{{paciente}} {{cedula}} {{procedimiento}} {{fecha}}`; iniciar una cita sin consentimiento vigente (365 días) abre la firma; firma con el dedo → PDF (QuestPDF) guardado como adjunto; el PDF firmado no se puede borrar (409); pestaña Consentimientos en la ficha | ✅ |
| **F22 · Móvil y PWA** | 390×844: cero scroll horizontal y cero elementos recortados en todas las rutas de los 4 roles + páginas públicas (50 capturas en `docs/manual/img/mobile/`); tablas como tarjetas; diálogos a pantalla completa; calendario en vista día; manifest con nombre y color del canal; hoja del día legible sin red; la copia offline se borra al cerrar sesión | ✅ (la instalación en un teléfono real y en iOS no se probó) |

### Flujos nuevos del 2026-09-18 (tarde)

| Flujo | Pasos verificados | Estado |
|---|---|---|
| **F23 · Pagos con trazabilidad** | El monto se propone con el saldo y no puede pasarse (422 con el saldo en el mensaje); referencia y comprobante (imagen o PDF) al registrar o después desde la fila; la tabla muestra quién lo registró; barra de progreso con el porcentaje y badge Pagado; eliminar un pago se lleva su comprobante | ✅ gate de push |
| **F24 · Dashboard alternable** | Citas ↔ Dinero (cobrado por día y saldo acumulado, un eje por escala) y Procedimientos ↔ Productos (unidades movidas con semáforo); la elección se recuerda por dispositivo; saludo con la hora de Bogotá | ✅ recorrido dueño cap. 5 |
| **F25 · Consumo de cabina** | Productos usados como lista en la nota; descuento solo con la cita Completada; salida ligada a cita y paciente; 400 sin stock; aviso al quedar bajo el mínimo; historial en la ficha del paciente y en los movimientos del producto | ✅ gate de push + recorrido esteticista cap. 4 |

### Lo que sigue abierto

| # | Pendiente | Prioridad |
|---|---|---|
| 18 / 19 | `LoginResponse.expiration` fijo en 60 min; el frontend descarta el refresh token | Media |
| — | Code-splitting: el paquete único (1,8 MB) lo precachea entero el service worker | Media |
| — | Advertencia EF 10622 restante en `ValuationProcedure` (no afecta datos vendidos) | Baja |
| 20 | Esteticista puede listar usuarios con email | Baja |
| — | Instalación de la PWA en iOS: Safari no emite `beforeinstallprompt`, no hay banner (se instala desde Compartir) | Baja |
| — | Sin cola de escritura offline: sin red la app solo lee | Fuera de alcance |
