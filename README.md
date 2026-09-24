# Taller de Costura Marisol · CRM

CRM web responsivo (mobile-first) para el taller de costura y alquiler de ternos **"Taller de Costura Marisol"**: alquileres, confección a medida con tablero Kanban, fichas de medidas, caja del día (Yape, Plin, efectivo), tickets imprimibles y recordatorios por WhatsApp.

**Stack:** Next.js 14 (App Router) · React 18 · TypeScript estricto · Tailwind CSS v3 · Radix UI (patrón shadcn/ui) · Lucide · Framer Motion · Supabase (PostgreSQL + Auth + Storage + Realtime) · TanStack Query v5 · React Hook Form + Zod · Recharts.

---

## Puesta en marcha (unos 10 minutos)

### 1. Supabase
1. Crea un proyecto en [supabase.com](https://supabase.com) (el plan gratuito basta).
2. **SQL Editor → New query** → pega el contenido de `supabase/schema.sql` → **Run**.
   Crea las 6 tablas, índices, triggers, políticas RLS, Realtime y los **3 buckets de Storage** con sus permisos.
3. (Opcional) Ejecuta `supabase/seed.sql` para cargar clientes y prendas de ejemplo.
4. **Authentication → Users → Add user**: crea el usuario del taller (correo y contraseña, marca *Auto Confirm User*).
5. **Project Settings → API**: copia la *Project URL* y la *anon public key*.

### 2. Proyecto
```bash
cp .env.example .env.local     # pega la URL y la anon key
npm install && npm run dev
```
Abre http://localhost:3000 e inicia sesión. Si falta `.env.local`, la app te lleva a la pantalla `/setup` con estos mismos pasos.

> Para usarlo desde el celular en el taller: despliega en Vercel (importa el repo y agrega las 2 variables de entorno) y "Agregar a pantalla de inicio". Incluye manifest PWA.

### Scripts
| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm run typecheck` | Verificación TypeScript estricta |
| `npm run lint` | ESLint |
| `npm run package` | Genera `../taller-marisol-crm.zip` sin `node_modules`, `.next` ni `.env.local` |

---

## Módulos

| Módulo | Ruta | Contenido |
|---|---|---|
| **Dashboard estratégico** | `/` | KPIs: alquileres por vencer (alerta visual hoy/mañana/vencidos), entregas de confección del día, caja chica por Yape/Efectivo/Plin. Gráficos de ingresos (7 días) y flujo de prendas. Botones gigantes `+ Nuevo Alquiler` / `+ Nueva Confección` y botón flotante en móvil. |
| **Alquileres** | `/alquileres` | *Contratos* (activos, en poder del cliente, vencidos, historial; entregar, recibir devolución con estado de garantía, cancelar, ticket) y *Catálogo* con filtro rápido por talla, color, categoría y disponibilidad + fotos. Asistente de salida en 4 pasos: cliente (o creación rápida) → prenda con miniatura → fechas, garantía y cobro → **Enviar recordatorio por WhatsApp**. |
| **Confecciones** | `/confecciones` | Tablero Kanban `Recibido ➔ En Corte ➔ En Costura ➔ Prueba ➔ Listo (➔ Entregado)`. Arrastrar y soltar en escritorio; columnas deslizables y botón "Avanzar" en móvil. Fotos de referencia, medidas específicas, cobro del saldo, aviso por WhatsApp. |
| **Clientes** | `/clientes` | Búsqueda, alta/edición, historial y **Ficha de Medidas interactiva** (10 medidas; al tocar un campo se resalta en la silueta dónde medir). |
| **Ajustes** | `/ajustes` | *Datos comerciales* (nombre, dirección, teléfono, RUC/DNI, leyenda) con vista previa en vivo del ticket · *Cobro digital*: drag-and-drop del QR de Yape, QR de Plin y logo, con previsualización en tiempo real de cómo lo ve el cliente · *Generador de ticket* 80 mm: imprimir, PDF, imagen o WhatsApp. |

## Storage (buckets)
| Bucket | Uso | Acceso |
|---|---|---|
| `rentals-gallery` | Fotos de ternos, vestidos y catálogo | Lectura pública · escritura autenticada |
| `tailoring-references` | Modelos, bocetos y diseños del cliente | Lectura pública · escritura autenticada |
| `business-assets` | QR de Yape, QR de Plin y logo | Lectura pública · escritura autenticada |

Las fotos se comprimen en el navegador (máx. 1600 px, WebP) antes de subirlas. Los QR se suben sin comprimir para que se escaneen bien. Al reemplazar o eliminar una imagen se borra también el archivo anterior.

## Reglas de negocio automáticas (en la base de datos)
- **Estado de la prenda sincronizado con el contrato** (trigger): Reservado → *Reservado*; Entregado → *Alquilado*; Devuelto/Cancelado → *Disponible*.
- **Vencidos**: `mark_overdue_rentals()` marca *Con Retraso* los contratos cuya fecha de devolución pasó (zona America/Lima). Se ejecuta al abrir el dashboard; opcionalmente prográmalo con `pg_cron`.
- `pending_balance` de las confecciones es una columna generada (`total_price - advance_payment`).
- Cada cobro queda en `payments` (Adelanto, Pago Total, Garantía, Liquidación Saldo), que alimenta la caja del día.

## Estructura (Clean Architecture)
```
taller-marisol-crm/
├── supabase/
│   ├── schema.sql              # DDL + RLS + triggers + Realtime + Storage buckets/políticas
│   └── seed.sql                # Datos de demostración (opcional)
├── public/                     # icon.svg, manifest.webmanifest
├── scripts/package.sh          # Empaquetado .zip
└── src/
    ├── app/                    # Rutas (App Router)
    │   ├── (app)/              # Rutas protegidas con AppShell
    │   │   ├── page.tsx        # Dashboard
    │   │   ├── alquileres/  confecciones/  clientes/  ajustes/
    │   ├── login/  setup/
    │   ├── layout.tsx  providers.tsx  globals.css
    ├── middleware.ts           # Sesión Supabase + protección de rutas
    ├── components/
    │   ├── ui/                 # Base: Button, Input/Select/Textarea, Field, Badge/StatusBadge,
    │   │                       #       Card, Modal (bottom-sheet móvil), ConfirmDialog, Tabs,
    │   │                       #       Segmented, Skeleton, EmptyState, ImageDropzone, MultiImageUploader
    │   └── modules/            # Vistas compuestas
    │       ├── dashboard/      # DashboardView, KpiCard, Charts, QuickActions/FAB
    │       ├── settings/       # SettingsView, BusinessInfoForm, DigitalPaymentsSection, ReceiptGenerator
    │       ├── rentals/        # RentalsView, ContractsList, RentalWizard, InventoryCatalog, modales
    │       ├── tailoring/      # TailoringView, KanbanBoard, OrderFormModal, OrderDetailModal
    │       ├── clients/        # ClientsView, ClientFormModal, ClientDetailModal
    │       ├── receipt/        # ReceiptTicket, ReceiptModal/Toolbar, exportación PNG/PDF/compartir
    │       ├── shared/         # ClientPicker, PaymentMethodPicker (muestra el QR), MeasuresForm
    │       ├── layout/         # AppShell (sidebar + bottom navigation)
    │       └── auth/           # LoginForm
    ├── hooks/                  # TanStack Query (use-data, use-settings), Realtime, query keys
    ├── lib/
    │   ├── supabase/           # client.ts (navegador, tipado), server.ts, middleware.ts, env.ts
    │   ├── validations.ts      # Esquemas Zod de todos los formularios
    │   ├── receipt.ts  whatsapp.ts  format.ts  utils.ts
    ├── services/               # CRUD Supabase Database + Storage (un servicio por tabla)
    └── types/                  # database.ts (tipos por tabla SQL) + index.ts (dominio y constantes)
```

## Notas
- **Seguridad:** RLS activo en todas las tablas; solo usuarios autenticados leen o escriben. Las imágenes son de lectura pública porque se muestran en tickets y al cliente; no subas documentos sensibles a esos buckets.
- **Comprobantes:** el ticket es un comprobante interno, no una boleta o factura electrónica SUNAT.
- **WhatsApp:** usa enlaces `wa.me` con plantillas (no requiere API de pago). En el celular, "WhatsApp" del ticket comparte la imagen mediante la hoja nativa.
- **Regenerar tipos:** `npx supabase gen types typescript --project-id <id> > src/types/database.ts` (conserva los alias de `src/types/index.ts`).
