-- =====================================================================
--  TALLER DE COSTURA MARISOL · CRM
--  Script completo para el SQL Editor de Supabase.
--  Es idempotente: puede ejecutarse más de una vez sin romper nada.
--  Orden: extensiones → tablas → índices → triggers → RLS → realtime
--         → storage buckets + políticas → datos iniciales
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. CONFIGURACIÓN DEL NEGOCIO / AJUSTES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name VARCHAR(100) DEFAULT 'Taller de Costura Marisol',
    phone VARCHAR(20),
    address TEXT,
    ruc_dni VARCHAR(20),
    yape_qr_url TEXT,
    plin_qr_url TEXT,
    logo_url TEXT,
    receipt_message TEXT DEFAULT '¡Gracias por confiar en nuestro taller!',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
-- Por si la tabla ya existía sin la columna del logo
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- ---------------------------------------------------------------------
-- 2. CLIENTES CON MEDIDAS TÉCNICAS DE COSTURA
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    dni VARCHAR(15),
    address TEXT,
    measures JSONB DEFAULT '{
      "pecho": "", "cintura": "", "cadera": "", "largo_manga": "",
      "talle_frente": "", "talle_espalda": "", "hombros": "",
      "largo_pantalon": "", "tiro": "", "cuello": ""
    }'::jsonb,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ---------------------------------------------------------------------
-- 3. INVENTARIO DE PRENDAS PARA ALQUILER
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rentals_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) CHECK (category IN ('Terno Completo', 'Saco', 'Pantalón', 'Vestido de Gala', 'Camisa', 'Accesorios')),
    size VARCHAR(20) NOT NULL,
    color VARCHAR(50),
    rental_price DECIMAL(10,2) NOT NULL,
    guarantee_price DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(30) DEFAULT 'Disponible' CHECK (status IN ('Disponible', 'Alquilado', 'En Mantenimiento', 'Reservado', 'Baja')),
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ---------------------------------------------------------------------
-- 4. CONTRATOS DE ALQUILER
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES public.rentals_inventory(id) ON DELETE RESTRICT,
    pickup_date DATE NOT NULL,
    return_date DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    deposit_amount DECIMAL(10,2) DEFAULT 0.00,
    guarantee_status VARCHAR(30) DEFAULT 'Retenida' CHECK (guarantee_status IN ('Retenida', 'Devuelta', 'Retenida por Daño')),
    status VARCHAR(30) DEFAULT 'Reservado' CHECK (status IN ('Reservado', 'Entregado', 'Devuelto', 'Con Retraso', 'Cancelado')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT rentals_dates_chk CHECK (return_date >= pickup_date)
);

-- ---------------------------------------------------------------------
-- 5. ÓRDENES DE CONFECCIÓN Y ARREGLOS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tailoring_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number SERIAL UNIQUE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    service_type VARCHAR(50) CHECK (service_type IN ('Confección a Medida', 'Arreglo / Ajuste', 'Transformación', 'Mantenimiento')),
    garment_description TEXT NOT NULL,
    reference_images TEXT[] DEFAULT ARRAY[]::TEXT[],
    delivery_date DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'Recibido' CHECK (status IN ('Recibido', 'En Corte', 'En Costura', 'Prueba Pendiente', 'Listo para Entregar', 'Entregado')),
    total_price DECIMAL(10,2) NOT NULL,
    advance_payment DECIMAL(10,2) DEFAULT 0.00,
    pending_balance DECIMAL(10,2) GENERATED ALWAYS AS (total_price - advance_payment) STORED,
    specific_measures JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ---------------------------------------------------------------------
-- 6. HISTORIAL DE PAGOS Y TRANSACCIONES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id UUID REFERENCES public.rentals(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.tailoring_orders(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(30) CHECK (payment_method IN ('Efectivo', 'Yape', 'Plin', 'Transferencia', 'Tarjeta')),
    reference_code VARCHAR(100),
    payment_type VARCHAR(30) CHECK (payment_type IN ('Adelanto', 'Pago Total', 'Garantía', 'Liquidación Saldo')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ---------------------------------------------------------------------
-- ÍNDICES (consultas del dashboard y filtros)
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_clients_full_name   ON public.clients (lower(full_name));
CREATE INDEX IF NOT EXISTS idx_clients_phone       ON public.clients (phone);
CREATE INDEX IF NOT EXISTS idx_inventory_status    ON public.rentals_inventory (status);
CREATE INDEX IF NOT EXISTS idx_inventory_category  ON public.rentals_inventory (category);
CREATE INDEX IF NOT EXISTS idx_rentals_return_date ON public.rentals (return_date);
CREATE INDEX IF NOT EXISTS idx_rentals_status      ON public.rentals (status);
CREATE INDEX IF NOT EXISTS idx_rentals_client      ON public.rentals (client_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery     ON public.tailoring_orders (delivery_date);
CREATE INDEX IF NOT EXISTS idx_orders_status       ON public.tailoring_orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_client       ON public.tailoring_orders (client_id);
CREATE INDEX IF NOT EXISTS idx_payments_created    ON public.payments (created_at);

-- ---------------------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------------------

-- a) updated_at automático en ajustes
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_business_settings_updated ON public.business_settings;
CREATE TRIGGER trg_business_settings_updated
BEFORE UPDATE ON public.business_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- b) Sincroniza el estado de la prenda con el estado del contrato
--    Reservado → prenda Reservada | Entregado / Con Retraso → Alquilado
--    Devuelto / Cancelado → Disponible (si no tiene otro contrato activo)
CREATE OR REPLACE FUNCTION public.sync_inventory_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  active_count INT;
BEGIN
  IF NEW.inventory_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'Reservado' THEN
    UPDATE public.rentals_inventory SET status = 'Reservado'
     WHERE id = NEW.inventory_id AND status = 'Disponible';
  ELSIF NEW.status IN ('Entregado', 'Con Retraso') THEN
    UPDATE public.rentals_inventory SET status = 'Alquilado'
     WHERE id = NEW.inventory_id AND status <> 'Baja';
  ELSIF NEW.status IN ('Devuelto', 'Cancelado') THEN
    SELECT count(*) INTO active_count
      FROM public.rentals
     WHERE inventory_id = NEW.inventory_id
       AND id <> NEW.id
       AND status IN ('Reservado', 'Entregado', 'Con Retraso');
    IF active_count = 0 THEN
      UPDATE public.rentals_inventory SET status = 'Disponible'
       WHERE id = NEW.inventory_id AND status IN ('Alquilado', 'Reservado');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rentals_sync_inventory ON public.rentals;
CREATE TRIGGER trg_rentals_sync_inventory
AFTER INSERT OR UPDATE OF status ON public.rentals
FOR EACH ROW EXECUTE FUNCTION public.sync_inventory_status();

-- c) Marca automáticamente como "Con Retraso" los alquileres vencidos.
--    Se invoca desde la app (rpc) al cargar el dashboard; también puede
--    programarse con pg_cron:  SELECT cron.schedule('retrasos','0 6 * * *','SELECT public.mark_overdue_rentals()');
CREATE OR REPLACE FUNCTION public.mark_overdue_rentals()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE public.rentals
     SET status = 'Con Retraso'
   WHERE status = 'Entregado'
     AND return_date < (timezone('America/Lima', now()))::date;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- ---------------------------------------------------------------------
-- SEGURIDAD A NIVEL DE FILA (RLS)
-- Modelo: el personal del taller inicia sesión (Supabase Auth).
-- Solo usuarios autenticados leen y escriben. El rol anónimo no ve nada.
-- ---------------------------------------------------------------------
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rentals_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rentals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tailoring_orders  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments          ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['business_settings','clients','rentals_inventory','rentals','tailoring_orders','payments']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%1$s_select_auth" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "%1$s_insert_auth" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "%1$s_update_auth" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "%1$s_delete_auth" ON public.%1$I', t);

    EXECUTE format('CREATE POLICY "%1$s_select_auth" ON public.%1$I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "%1$s_insert_auth" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "%1$s_update_auth" ON public.%1$I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "%1$s_delete_auth" ON public.%1$I FOR DELETE TO authenticated USING (true)', t);
  END LOOP;
END $$;

-- La configuración nunca se borra desde la app
DROP POLICY IF EXISTS "business_settings_delete_auth" ON public.business_settings;

GRANT EXECUTE ON FUNCTION public.mark_overdue_rentals() TO authenticated;

-- ---------------------------------------------------------------------
-- REALTIME: el dashboard se actualiza solo cuando cambia algo
-- ---------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['rentals','tailoring_orders','payments','rentals_inventory','clients']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- STORAGE BUCKETS
--  rentals-gallery       → fotos de ternos, vestidos y catálogo
--  tailoring-references  → fotos de modelos, bocetos y diseños del cliente
--  business-assets       → QR de Yape, QR de Plin y logo del negocio
--  Lectura pública (las URLs se muestran a clientes / en tickets);
--  escritura, edición y borrado solo para usuarios autenticados.
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('rentals-gallery',      'rentals-gallery',      true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/heic']),
  ('tailoring-references', 'tailoring-references', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/heic']),
  ('business-assets',      'business-assets',      true, 2097152, ARRAY['image/jpeg','image/png','image/webp','image/svg+xml'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "taller_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "taller_auth_insert"  ON storage.objects;
DROP POLICY IF EXISTS "taller_auth_update"  ON storage.objects;
DROP POLICY IF EXISTS "taller_auth_delete"  ON storage.objects;

CREATE POLICY "taller_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id IN ('rentals-gallery','tailoring-references','business-assets'));

CREATE POLICY "taller_auth_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('rentals-gallery','tailoring-references','business-assets'));

CREATE POLICY "taller_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id IN ('rentals-gallery','tailoring-references','business-assets'))
  WITH CHECK (bucket_id IN ('rentals-gallery','tailoring-references','business-assets'));

CREATE POLICY "taller_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id IN ('rentals-gallery','tailoring-references','business-assets'));

-- ---------------------------------------------------------------------
-- DATOS INICIALES: una única fila de configuración
-- ---------------------------------------------------------------------
INSERT INTO public.business_settings (business_name, phone, address, receipt_message)
SELECT 'Taller de Costura Marisol', '', '', '¡Gracias por confiar en nuestro taller!'
WHERE NOT EXISTS (SELECT 1 FROM public.business_settings);
