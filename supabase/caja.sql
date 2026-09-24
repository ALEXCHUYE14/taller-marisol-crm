-- =====================================================================
--  TALLER DE COSTURA MARISOL · CRM  ·  MÓDULO CAJA
--  Egresos, cierres de caja y saldos por cobrar.
--  Ejecútalo UNA vez en Supabase → SQL Editor → New query → Run.
--  Es idempotente (puedes correrlo de nuevo sin romper nada) y no toca
--  ninguna tabla existente. También está incluido al final de schema.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. EGRESOS (compra de tela, hilos, servicios, sueldos, devolución de garantías…)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_date DATE NOT NULL DEFAULT (timezone('America/Lima', now()))::date,
    category VARCHAR(40) NOT NULL CHECK (category IN (
        'Tela', 'Hilos e insumos', 'Botones y accesorios', 'Alquiler del local', 'Servicios',
        'Sueldos y pagos', 'Transporte', 'Mantenimiento de máquinas', 'Devolución de garantía', 'Otros'
    )),
    description TEXT,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(30) NOT NULL DEFAULT 'Efectivo'
        CHECK (payment_method IN ('Efectivo', 'Yape', 'Plin', 'Transferencia', 'Tarjeta')),
    receipt_url TEXT,
    rental_id UUID REFERENCES public.rentals(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses (expense_date);

-- ---------------------------------------------------------------------
-- 2. CIERRES DE CAJA (uno por día; no se pueden editar, solo reabrir)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cash_closings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    closing_date DATE NOT NULL UNIQUE,
    opening_cash DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (opening_cash >= 0),
    income_total DECIMAL(10,2) NOT NULL DEFAULT 0,      -- ingresos del taller (sin garantías)
    guarantees_in DECIMAL(10,2) NOT NULL DEFAULT 0,     -- garantías cobradas (custodia)
    expenses_total DECIMAL(10,2) NOT NULL DEFAULT 0,    -- egresos operativos (sin devolución de garantías)
    guarantees_out DECIMAL(10,2) NOT NULL DEFAULT 0,    -- garantías devueltas
    cash_in DECIMAL(10,2) NOT NULL DEFAULT 0,           -- efectivo cobrado (incluye garantías)
    cash_out DECIMAL(10,2) NOT NULL DEFAULT 0,          -- efectivo pagado (incluye devoluciones)
    expected_cash DECIMAL(10,2) NOT NULL DEFAULT 0,     -- fondo inicial + cash_in - cash_out
    counted_cash DECIMAL(10,2) NOT NULL CHECK (counted_cash >= 0),
    difference DECIMAL(10,2) GENERATED ALWAYS AS (counted_cash - expected_cash) STORED,
    by_method JSONB NOT NULL DEFAULT '{}'::jsonb,       -- cobros del día por medio de pago
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_cash_closings_date ON public.cash_closings (closing_date DESC);

-- ---------------------------------------------------------------------
-- 3. Un día con cierre no admite altas, cambios ni bajas de egresos
--    (para reabrirlo: Caja → Cierre → Reabrir día)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_closed_day()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    IF EXISTS (SELECT 1 FROM public.cash_closings WHERE closing_date = OLD.expense_date) THEN
      RAISE EXCEPTION 'El día % ya tiene cierre de caja. Reábrelo en Caja → Cierre para modificar sus egresos.',
        to_char(OLD.expense_date, 'DD/MM/YYYY');
    END IF;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF EXISTS (SELECT 1 FROM public.cash_closings WHERE closing_date = NEW.expense_date) THEN
      RAISE EXCEPTION 'El día % ya tiene cierre de caja. Reábrelo en Caja → Cierre para modificar sus egresos.',
        to_char(NEW.expense_date, 'DD/MM/YYYY');
    END IF;
    RETURN NEW;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_expenses_guard_closed_day ON public.expenses;
CREATE TRIGGER trg_expenses_guard_closed_day
BEFORE INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.guard_closed_day();

-- ---------------------------------------------------------------------
-- 4. SALDOS POR COBRAR (alquileres y confecciones con deuda)
--    Alquiler: total - pagos que no son garantía. Se ignoran los cancelados.
--    security_invoker: respeta las políticas RLS del usuario que consulta.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.receivables WITH (security_invoker = true) AS
SELECT
    'Alquiler'::text AS kind,
    r.id,
    r.client_id,
    c.full_name AS client_name,
    c.phone AS client_phone,
    (COALESCE(i.name, 'Prenda') || COALESCE(' · T' || i.size, ''))::text AS description,
    r.total_amount AS total,
    COALESCE(p.paid, 0)::numeric(10,2) AS paid,
    (r.total_amount - COALESCE(p.paid, 0))::numeric(10,2) AS balance,
    r.return_date AS due_date,
    r.status::text AS status
FROM public.rentals r
LEFT JOIN public.clients c ON c.id = r.client_id
LEFT JOIN public.rentals_inventory i ON i.id = r.inventory_id
LEFT JOIN LATERAL (
    SELECT SUM(amount) AS paid
      FROM public.payments
     WHERE rental_id = r.id AND payment_type IS DISTINCT FROM 'Garantía'
) p ON TRUE
WHERE r.status <> 'Cancelado'
  AND r.total_amount - COALESCE(p.paid, 0) > 0.005
UNION ALL
SELECT
    'Confección'::text AS kind,
    o.id,
    o.client_id,
    c.full_name AS client_name,
    c.phone AS client_phone,
    ('N° ' || o.order_number || ' · ' || left(o.garment_description, 60))::text AS description,
    o.total_price AS total,
    COALESCE(o.advance_payment, 0)::numeric(10,2) AS paid,
    o.pending_balance::numeric(10,2) AS balance,
    o.delivery_date AS due_date,
    o.status::text AS status
FROM public.tailoring_orders o
LEFT JOIN public.clients c ON c.id = o.client_id
WHERE o.pending_balance > 0.005;

GRANT SELECT ON public.receivables TO authenticated;

-- ---------------------------------------------------------------------
-- 5. SEGURIDAD (RLS): solo usuarios autenticados, igual que el resto del CRM
--    Los cierres no tienen política de UPDATE: una vez guardados no se editan.
-- ---------------------------------------------------------------------
ALTER TABLE public.expenses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_closings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_select_auth" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_auth" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update_auth" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete_auth" ON public.expenses;
CREATE POLICY "expenses_select_auth" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "expenses_insert_auth" ON public.expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "expenses_update_auth" ON public.expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "expenses_delete_auth" ON public.expenses FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "cash_closings_select_auth" ON public.cash_closings;
DROP POLICY IF EXISTS "cash_closings_insert_auth" ON public.cash_closings;
DROP POLICY IF EXISTS "cash_closings_delete_auth" ON public.cash_closings;
CREATE POLICY "cash_closings_select_auth" ON public.cash_closings FOR SELECT TO authenticated USING (true);
CREATE POLICY "cash_closings_insert_auth" ON public.cash_closings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cash_closings_delete_auth" ON public.cash_closings FOR DELETE TO authenticated USING (true);

-- ---------------------------------------------------------------------
-- 6. REALTIME: la caja se actualiza sola cuando cambia algo
-- ---------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['expenses','cash_closings']
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
-- 7. STORAGE: fotos de comprobantes de compra (boletas, facturas, recibos)
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('expense-receipts', 'expense-receipts', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/heic'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "receipts_public_read" ON storage.objects;
DROP POLICY IF EXISTS "receipts_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "receipts_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "receipts_auth_delete" ON storage.objects;

CREATE POLICY "receipts_public_read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'expense-receipts');
CREATE POLICY "receipts_auth_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'expense-receipts');
CREATE POLICY "receipts_auth_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'expense-receipts') WITH CHECK (bucket_id = 'expense-receipts');
CREATE POLICY "receipts_auth_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'expense-receipts');
