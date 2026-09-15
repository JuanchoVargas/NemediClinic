# Nemedi Clinic — Manual de usuario (borrador)

Este manual se generó recorriendo la aplicación real con los datos de demostración, paso a paso y por rol. Cada paso tiene su pantalla capturada tal como la ve el usuario. Los pasos que hoy no funcionan o no existen están al final, en **Pendientes**.

Fecha del recorrido: 15 de septiembre de 2026. Resolución de las capturas: 1440 × 900.

**Cuentas usadas en el recorrido**

| Rol | Usuario | Contraseña |
|---|---|---|
| Dueño / administrador general | juandiegov2002@gmail.com | Admin2026! |
| Recepción | recepcion@nemedi.demo | Demo2026! |
| Esteticista | laura.perez@nemedi.demo | Demo2026! |

**Cómo se lee.** ✅ el paso funcionó como se describe. ❌ el paso no se pudo completar; está explicado en Pendientes.

---

# Parte 1 · Dueño / administrador general

El dueño ve y puede hacer todo: configurar la clínica, sus sedes y usuarios, mantener el catálogo de procedimientos, paquetes y productos, y supervisar la agenda completa.

## Capítulo 1 · Entrar y salir

**1.1 · Pantalla de inicio de sesión** ✅
Abre la aplicación. Verás el formulario con Email y Contraseña.

![](img/superadmin/cap1-01-pantalla-de-inicio-de-sesion.png)

**1.2 · Ingresar como dueño** ✅
Escribe tu correo y contraseña y pulsa **Ingresar**. Entras al Dashboard. Arriba a la derecha aparece tu correo y, en el menú, la opción **Administración** que solo ven el dueño y recepción.

![](img/superadmin/cap1-02-ingresar-como-dueno-superadmin.png)

**1.3 · Cerrar sesión** ✅
Pulsa **Cerrar sesión** en la esquina superior derecha. Vuelves a la pantalla de ingreso.

![](img/superadmin/cap1-03-cerrar-sesion.png)

**1.4 · Sin sesión no se puede entrar** ✅
Si alguien escribe una dirección interna (por ejemplo la lista de pacientes) sin haber ingresado, el sistema lo devuelve a la pantalla de ingreso.

![](img/superadmin/cap1-04-ruta-protegida-sin-sesion-redirige-al-login.png)

## Capítulo 2 · Configurar la clínica

**2.1 · Sedes** ✅
Menú **Administración → Sedes**. Aquí están las sucursales de la clínica. La demo arranca con "Sede Principal".

![](img/superadmin/cap2-01-sedes-lista-de-sedes-de-la-clinica.png)

**2.2 · Crear una sede** ✅
Pulsa **Nueva sede**, completa nombre, dirección y teléfono y guarda con **Crear**. La sede aparece de inmediato en la lista.

![](img/superadmin/cap2-02-crear-sede-sede-chapinero.png)

**2.3 · Usuarios** ✅
Menú **Administración → Usuarios**. Verás a cada persona con su rol (SuperAdmin, Admin o Esteticista) y su sede.

![](img/superadmin/cap2-03-usuarios-lista-de-usuarios-y-roles.png)

**2.4 · Crear un usuario de recepción (Admin)** ✅
Pulsa **Nuevo usuario**, escribe nombre, apellido, correo y contraseña, elige el rol **Admin** y la sede, y pulsa **Crear**.

![](img/superadmin/cap2-04-crear-usuario-admin-monica-herrera.png)

**2.5 · Crear una esteticista con sede** ✅
Igual que el anterior, pero con rol **Esteticista** y la sede donde atiende.

![](img/superadmin/cap2-05-crear-usuario-esteticista-daniela-ospina-en-sede.png)

**2.6 · Editar un usuario** ✅
Pulsa el lápiz de la fila, cambia lo que necesites y pulsa **Guardar cambios**.

![](img/superadmin/cap2-06-editar-usuario-apellido-ospina-rios.png)

**2.7 · Desactivar un usuario** ❌
Hoy el formulario no tiene la opción de desactivar. Ver Pendientes.

![](img/superadmin/cap2-07-desactivar-usuario-desde-el-formulario.png)

**2.8 · Tenants (tu clínica)** ✅
Menú **Administración → Tenants** muestra la ficha de tu clínica. Solo el dueño ve esta pantalla.

![](img/superadmin/cap2-08-tenants-lectura-del-propio-clinica.png)

## Capítulo 3 · Catálogo: procedimientos y paquetes

**3.1 · Procedimientos** ✅
Menú **Procedimientos**. Es la lista de servicios que ofrece la clínica con precio, duración y área corporal.

![](img/superadmin/cap3-01-procedimientos-catalogo-actual.png)

**3.2 · Crear un procedimiento** ✅
Pulsa **Nuevo procedimiento**. Escribe el precio sin puntos (150000) y el sistema lo muestra como **$150.000** en la lista.

![](img/superadmin/cap3-02-crear-procedimiento-limpieza-facial-express-con-.png)

**3.3 · Editar un procedimiento** ✅
Con el lápiz de la fila cambias, por ejemplo, la duración.

![](img/superadmin/cap3-03-editar-procedimiento-duracion-45-min.png)

**3.4 · Desactivar un procedimiento** ✅
En el formulario de edición apaga el interruptor **Activo**. La fila queda marcada como "Inactivo".

![](img/superadmin/cap3-04-desactivar-procedimiento.png)

**3.5 · Un procedimiento inactivo no debería ofrecerse al agendar** ❌
Hoy sigue apareciendo en la lista al crear una cita. Ver Pendientes.

![](img/superadmin/cap3-05-el-procedimiento-inactivo-no-aparece-al-crear-un.png)

**3.6 · Crear un paquete con dos procedimientos** ✅
Menú **Paquetes → Nuevo paquete**. Busca cada procedimiento, indica cuántas sesiones incluye y pulsa **Agregar**. El total de sesiones y el **precio de referencia** (la suma de las sesiones sueltas) se calculan solos.

![](img/superadmin/cap3-06-crear-paquete-duo-facial-express-con-2-procedimi.png)

**3.7 · Precio con descuento** ✅
Si escribes un precio menor al de referencia, aparece un aviso amarillo con el descuento en pesos y en porcentaje.

![](img/superadmin/cap3-07-precio-con-descuento-muestra-el-aviso.png)

**3.8 · Guardar el paquete** ✅
Pulsa **Crear paquete**.

![](img/superadmin/cap3-08-guardar-el-paquete.png)

**3.9 · Detalle del paquete** ✅
Muestra precio, vigencia, alerta de vencimiento y los procedimientos incluidos con sus sesiones.

![](img/superadmin/cap3-09-detalle-del-paquete.png)

**3.10 · Eliminar un paquete** ✅
En la lista, pulsa la papelera y confirma. El paquete desaparece del catálogo.

![](img/superadmin/cap3-10-eliminar-el-paquete.png)

## Capítulo 4 · Inventario

**4.1 · Productos con semáforo** ✅
Menú **Inventario**. Cada producto tiene un semáforo según su stock frente al mínimo: **Verde** (bien), **Amarillo** (bajo), **Rojo** (crítico).

![](img/superadmin/cap4-01-inventario-productos-con-semaforo.png)

**4.2 · Crear un producto** ✅
Pulsa **Nuevo producto**. Un producto nuevo arranca con stock 0; con mínimo 100 queda en **Rojo** hasta que registres una entrada.

![](img/superadmin/cap4-02-crear-producto-serum-vitamina-c-30-ml-con-stock-.png)

**4.3 · Editar un producto** ✅
Con el lápiz cambias, por ejemplo, el stock mínimo.

![](img/superadmin/cap4-03-editar-producto-stock-minimo-80.png)

**4.4 · Eliminar un producto** ✅
Papelera y confirmación.

![](img/superadmin/cap4-04-eliminar-producto.png)

## Capítulo 5 · Vista general de la agenda

**5.1 · Calendario con todas las esteticistas** ✅
Menú **Calendario**. El dueño ve las citas de toda la clínica, con colores por estado.

![](img/superadmin/cap5-01-calendario-con-las-citas-de-todas-las-esteticist.png)

**5.2 · Filtrar por esteticista** ✅
Con el selector **Todos los esteticistas** puedes ver solo la agenda de una persona.

![](img/superadmin/cap5-02-filtrar-el-calendario-por-esteticista-camila-rui.png)

**5.3 · Hoja del día** ✅
**Calendario → Hoja del día** lista las citas del día en orden, con paciente, procedimiento, esteticista y estado.

![](img/superadmin/cap5-03-hoja-del-dia-de-toda-la-clinica.png)

---

# Parte 2 · Recepción

Recepción administra pacientes, agenda, paquetes, pagos e inventario. No crea sedes ni usuarios (eso lo hace el dueño) ni ve la ficha de la clínica.

## Capítulo 1 · Entrar y qué puedes hacer

**1.1 · Ingresar como Recepción** ✅

![](img/admin/cap1-01-ingresar-como-recepcion-admin.png)

**1.2 · Menú Administración** ✅
Muestra **Usuarios** y **Sedes**. La opción Tenants no aparece porque es solo del dueño.

![](img/admin/cap1-02-el-menu-administracion-muestra-usuarios-y-sedes-.png)

**1.3 · Sedes: ver y editar, no crear** ✅
Puedes corregir datos de una sede, pero el botón **Nueva sede** no está disponible para recepción.

![](img/admin/cap1-03-sedes-puede-ver-y-editar-pero-no-crear.png)

**1.4 · Usuarios: editar, no crear** ✅
Puedes editar usuarios existentes; crear usuarios nuevos es tarea del dueño.

![](img/admin/cap1-04-usuarios-sin-nuevo-usuario-pero-con-editar.png)

**1.5 · Si intentas entrar a Tenants** ✅
El sistema te devuelve al inicio.

![](img/admin/cap1-05-escribir-la-direccion-de-tenants-super-tenants-v.png)

**1.6 · Aviso de permisos** ❌
Al escribir la dirección directamente en el navegador, el aviso "No tienes permisos" no alcanza a mostrarse. Ver Pendientes.

![](img/admin/cap1-06-y-muestra-el-aviso-no-tienes-permisos.png)

## Capítulo 2 · Pacientes

**2.1 · Crear un paciente** ✅
Menú **Pacientes → Nuevo paciente**. Nombre, apellido, cédula y teléfono son obligatorios. Al guardar, el sistema crea también su historia clínica vacía.

![](img/admin/cap2-01-crear-paciente-laura-restrepo-mejia.png)

**2.2 · Cédula repetida** ✅
Si la cédula ya existe, el sistema no guarda y muestra el aviso "Ya existe un paciente con esa cédula".

![](img/admin/cap2-02-cedula-duplicada-el-sistema-lo-rechaza-con-un-av.png)

**2.3 · Buscar por nombre** ✅
Escribe en el buscador; la lista se filtra mientras escribes.

![](img/admin/cap2-03-buscar-por-nombre-valentina.png)

**2.4 · Buscar por cédula** ✅

![](img/admin/cap2-04-buscar-por-cedula-1000000003.png)

**2.5 · Ficha del paciente: Información** ✅
Pulsa **Ver** en la fila. La ficha tiene cuatro pestañas.

![](img/admin/cap2-05-ficha-de-valentina-tab-informacion.png)

**2.6 · Historia clínica** ✅
Antecedentes, alergias, medicamentos y las notas de cada sesión.

![](img/admin/cap2-06-ficha-de-valentina-tab-historia-clinica.png)

**2.7 · Paquetes** ✅
Los paquetes contratados por el paciente con su avance de sesiones.

![](img/admin/cap2-07-ficha-de-valentina-tab-paquetes.png)

**2.8 · Pagos** ✅
Lo acordado, lo pagado y el saldo de cada paquete.

![](img/admin/cap2-08-ficha-de-valentina-tab-pagos.png)

**2.9 · Editar un paciente** ✅
Botón **Editar** en la ficha, cambia el dato y pulsa **Guardar cambios**.

![](img/admin/cap2-09-editar-telefono-del-paciente-nuevo.png)

**2.10 · Eliminar un paciente** ✅
En la lista, papelera y confirmación. El paciente deja de aparecer en búsquedas.

![](img/admin/cap2-10-eliminar-el-paciente-nuevo.png)

## Capítulo 3 · Vender un paquete y registrar pagos

**3.1 · Asignar un paquete a un paciente** ✅
Menú **Paquetes**, abre el paquete con **Ver** y pulsa **Asignar a paciente**. Busca al paciente, ajusta el precio acordado si negociaste algo distinto y pulsa **Asignar**. El sistema te lleva a la ficha del paciente.

![](img/admin/cap3-01-asignar-plan-mantenimiento-facial-a-sara-hernand.png)

**3.2 · Avance de sesiones** ✅
En la pestaña **Paquetes** el paquete nuevo aparece con **0 / N** sesiones.

![](img/admin/cap3-02-ficha-de-sara-el-paquete-aparece-con-0-2-sesione.png)

**3.3 · Pago parcial** ✅
En la pestaña **Pagos**, pulsa **Registrar pago**, escribe el monto y el método. Mientras quede saldo, el resumen se muestra en **amarillo**.

![](img/admin/cap3-03-pago-parcial-de-80-000-saldo-pendiente-en-amaril.png)

**3.4 · Pago del saldo** ✅
El formulario propone el saldo restante. Al quedar en $0 el resumen pasa a **verde**.

![](img/admin/cap3-04-pago-del-resto-saldo-0-en-verde.png)

## Capítulo 4 · Agenda

**4.1 · Vista de mes** ✅

![](img/admin/cap4-01-vista-de-mes.png)

**4.2 · Vista de semana** ✅

![](img/admin/cap4-02-vista-de-semana.png)

**4.3 · Vista de día** ✅

![](img/admin/cap4-03-vista-de-dia.png)

**4.4 · Crear una cita** ✅
En la vista de semana, haz clic en el espacio libre del día y la hora. Se abre el formulario con esa hora ya puesta. Elige paciente, procedimiento y esteticista; la hora de fin se calcula con la duración del procedimiento. Pulsa **Crear cita**.

![](img/admin/cap4-04-crear-cita-para-manana-10-00-con-laura-perez-san.png)

**4.5 · Otra cita para otra esteticista** ✅

![](img/admin/cap4-05-crear-cita-para-manana-13-00-con-camila-ruiz-sar.png)

**4.6 · Choque de horario** ✅
Si la esteticista ya tiene una cita a esa hora, el sistema no la agenda y avisa "El esteticista ya tiene una cita en ese horario".

![](img/admin/cap4-06-conflicto-de-horario-laura-ya-tiene-cita-a-las-0.png)

**4.7 · Confirmar una cita** ✅
Haz clic en la cita para abrir su detalle y pulsa **Confirmar** (por ejemplo cuando el paciente confirma por WhatsApp).

![](img/admin/cap4-07-confirmar-la-cita-de-laura-manana-10-00.png)

**4.8 · Cancelar una cita** ✅
En el detalle, pulsa **Cancelar**. La cita queda en rojo en el calendario.

![](img/admin/cap4-08-cancelar-la-cita-de-camila-manana-13-00.png)

**4.9 · Hoja del día: hoy** ✅
**Calendario → Hoja del día**. Con el campo de fecha y las flechas te mueves entre días.

![](img/admin/cap4-09-hoja-del-dia-hoy.png)

**4.10 · Hoja del día: ayer** ✅

![](img/admin/cap4-10-hoja-del-dia-ayer.png)

**4.11 · Hoja del día: mañana** ✅

![](img/admin/cap4-11-hoja-del-dia-manana.png)

**4.12 · La sesión atendida se descuenta del paquete** ✅
Cuando la esteticista completa una cita que pertenece a un paquete (ver Parte 3), en la ficha del paciente el avance sube (aquí, **1 / 2**).

![](img/admin/cap4-12-tras-completar-laura-su-sesion-la-ficha-de-julia.png)

## Capítulo 5 · Inventario

**5.1 · Alertas de stock** ✅
**Inventario → Alertas** muestra los productos por debajo del mínimo: **Crítico** (rojo) o **Bajo** (amarillo).

![](img/admin/cap5-01-alertas-de-stock-bajo.png)

**5.2 · Reponer desde la alerta** ✅
El botón **Registrar entrada** de la tarjeta abre el formulario con el producto ya elegido.

![](img/admin/cap5-02-registrar-entrada-desde-la-alerta-el-producto-ll.png)

**5.3 · Registrar la entrada** ✅
Escribe la cantidad y pulsa **Registrar**. El producto sale de Alertas.

![](img/admin/cap5-03-entrada-de-200-unidades-el-semaforo-cambia-y-sal.png)

**5.4 · Historial de entradas** ✅
La pestaña **Entradas** lista cada reposición con fecha, cantidad, motivo y quién la registró.

![](img/admin/cap5-04-historial-en-el-tab-entradas.png)

**5.5 · Semáforo actualizado** ✅
En **Productos** el semáforo del producto repuesto ya está en **Verde**.

![](img/admin/cap5-05-productos-el-semaforo-del-producto-quedo-en-verd.png)

**5.6 · Movimientos por producto** ❌
No existe todavía una pantalla con el historial de movimientos (entradas y salidas) de un producto. Ver Pendientes.

![](img/admin/cap5-06-movimientos-de-inventario-por-producto.png)

---

# Parte 3 · Esteticista

La esteticista trabaja sobre su propia agenda: ve solo sus citas, las atiende cambiándolas de estado, consulta la ficha y la historia de sus pacientes y puede registrar entradas de inventario. No ve precios de paquetes, pagos ni la administración.

## Capítulo 1 · Entrar y qué puedes hacer

**1.1 · Ingresar** ✅

![](img/esteticista/cap1-01-ingresar-como-laura-perez-esteticista.png)

**1.2 · Menú reducido** ✅
No aparecen **Paquetes** ni **Administración**.

![](img/esteticista/cap1-02-el-menu-no-muestra-administracion-ni-paquetes.png)

**1.3 · Procedimientos: solo consulta** ✅
Puedes ver el catálogo, sin botones de crear, editar ni eliminar.

![](img/esteticista/cap1-03-procedimientos-solo-lectura-sin-crear-editar-ni-.png)

**1.4 · Productos: solo consulta** ✅

![](img/esteticista/cap1-04-productos-solo-lectura-sin-crear-editar-ni-elimi.png)

**1.5 · Si escribes la dirección de Usuarios** ✅
El sistema te devuelve al inicio.

![](img/esteticista/cap1-05-escribir-la-direccion-de-usuarios-admin-users-vu.png)

**1.6 · Aviso de permisos** ❌
El aviso "No tienes permisos" no se muestra al escribir la dirección. Ver Pendientes.

![](img/esteticista/cap1-06-y-muestra-el-aviso-no-tienes-permisos.png)

**1.7 · Si escribes la dirección de Paquetes** ✅

![](img/esteticista/cap1-07-escribir-la-direccion-de-paquetes-packages-vuelv.png)

**1.8 · Aviso de permisos** ❌
Mismo caso que 1.6.

![](img/esteticista/cap1-08-y-muestra-el-aviso-no-tienes-permisos.png)

## Capítulo 2 · Mi día

**2.1 · Hoja del día: solo mis citas** ✅

![](img/esteticista/cap2-01-hoja-del-dia-solo-mis-citas.png)

**2.2 · Calendario: solo mis citas** ✅
No hay selector de esteticista; el calendario ya está filtrado a tu agenda.

![](img/esteticista/cap2-02-calendario-solo-mis-citas-y-sin-filtro-de-esteti.png)

**2.3 · Abrir una cita** ✅
Haz clic en la cita para ver paciente, procedimiento, hora y estado.

![](img/esteticista/cap2-03-abrir-una-de-mis-citas-santiago-castro-hoy-8-00.png)

## Capítulo 3 · Atender una cita

**3.1 · Agendar una cita propia** ✅
Al hacer clic en un espacio libre, el campo **Esteticista** viene fijo con tu nombre.

![](img/esteticista/cap3-01-crear-una-cita-la-esteticista-queda-fija-en-laur.png)

**3.2 · Guardar** ✅

![](img/esteticista/cap3-02-guardar-la-cita-nueva.png)

**3.3 · Confirmar** ✅
Abre la cita y pulsa **Confirmar**.

![](img/esteticista/cap3-03-confirmar-la-cita-de-juliana-martinez-9-00-sesio.png)

**3.4 · Iniciar** ✅
Cuando la paciente entra a cabina, pulsa **Iniciar**. La cita pasa a "En curso".

![](img/esteticista/cap3-04-iniciar-la-sesion-en-curso.png)

**3.5 · Completar** ✅
Al terminar, pulsa **Completar**. Si la cita pertenece a un paquete, la sesión queda descontada automáticamente.

![](img/esteticista/cap3-05-completar-la-sesion.png)

**3.6 · Las citas de otras esteticistas no se ven** ✅
Tu calendario solo muestra tus citas, así que no puedes cambiar el estado de una cita ajena.

![](img/esteticista/cap3-06-las-citas-de-camila-no-aparecen-en-mi-calendario.png)

## Capítulo 4 · Pacientes

**4.1 · Crear un paciente** ✅
También puedes registrar pacientes nuevos desde **Pacientes → Nuevo paciente**.

![](img/esteticista/cap4-01-crear-paciente-camilo-restrepo.png)

**4.2 · Ficha: Información** ✅

![](img/esteticista/cap4-02-abrir-la-ficha-tab-informacion.png)

**4.3 · Historia clínica (consulta)** ✅

![](img/esteticista/cap4-03-tab-historia-clinica-lectura.png)

**4.4 · Sin pestañas de Paquetes ni Pagos** ✅
La información comercial no está disponible para la esteticista.

![](img/esteticista/cap4-04-no-existen-los-tabs-paquetes-ni-pagos-para-la-es.png)

## Capítulo 5 · Inventario

**5.1 · Registrar una entrada** ✅
**Inventario → Entradas → Registrar entrada**. Busca el producto, escribe la cantidad y pulsa **Registrar**.

![](img/esteticista/cap5-01-registrar-una-entrada-de-10-paquetes-de-toallas-.png)

**5.2 · No puedes crear productos** ✅

![](img/esteticista/cap5-02-no-puede-crear-productos.png)

---

# Pendientes

Pasos del recorrido que hoy fallan o no existen. El número indica parte y paso.

| # | Paso | Qué pasa | Pista técnica |
|---|---|---|---|
| 1 | Dueño 2.7 · Desactivar un usuario | El formulario de usuario no tiene la opción "Activo". Solo se puede eliminar. | La API acepta `isActive` en `PUT /users/{id}`; falta el interruptor en `UsersPage`. |
| 2 | Dueño 3.5 · Procedimiento inactivo al agendar | Un procedimiento desactivado sigue apareciendo en el selector de "Nueva cita". | `CalendarPage` no filtra `activo`; `GET /procedures` tampoco. |
| 3 | Recepción 1.6 · Aviso de permisos | Al escribir a mano una dirección prohibida, el sistema sí devuelve al inicio pero no muestra "No tienes permisos". | El guard del router dispara el toast antes de que el `Toaster` esté montado en una carga directa de URL. |
| 4 | Esteticista 1.6 · Aviso de permisos | Igual que el anterior. | Igual que el anterior. |
| 5 | Esteticista 1.8 · Aviso de permisos | Igual que el anterior. | Igual que el anterior. |
| 6 | Recepción 5.6 · Movimientos por producto | No hay pantalla de movimientos de inventario. | El endpoint `GET /inventory/movements/product/{id}` responde 500 (`MapToDto` sin `Include(Product)`), y no hay tab en `InventoryPage`. |

Además, dos limitaciones que el recorrido no pudo cubrir porque no existen en la interfaz: **editar la historia clínica y registrar notas de evolución** (la API lo permite; la esteticista hoy solo consulta) y **cambiar el estado de un paquete** (pausar, vencer).

---

## Cómo se regenera este manual

```bash
corepack pnpm test:ui
```

Ejecuta el recorrido completo (dueño → esteticista → recepción) contra `http://localhost:5173` con los datos de `POST /api/v1/dev/seed-demo`, levanta la API y Vite si hace falta, crea el usuario `recepcion@nemedi.demo` si no existe, guarda cada captura en `docs/manual/img/<rol>/` y los resultados en `tests/e2e/ui/.results/`. Todo lo que crea (sede, usuarios, procedimiento, paquetes, productos, pacientes y citas) se elimina al final para dejar los datos de demostración como estaban.
