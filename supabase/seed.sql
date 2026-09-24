-- =====================================================================
--  DATOS DE DEMOSTRACIÓN (opcional) — ejecutar DESPUÉS de schema.sql
--  Sirve para probar el CRM con información realista. Puedes borrarlos luego.
-- =====================================================================

INSERT INTO public.clients (full_name, phone, dni, address, measures, notes) VALUES
('Carlos Mendoza Ruiz', '987654321', '45678912', 'Jr. Lima 245, Catacaos',
 '{"pecho":"100","cintura":"86","cadera":"98","largo_manga":"62","talle_frente":"44","talle_espalda":"46","hombros":"46","largo_pantalon":"104","tiro":"27","cuello":"40"}', 'Prefiere corte slim'),
('Lucía Paredes Silva', '956123478', '72345618', 'Av. Grau 1020, Piura',
 '{"pecho":"88","cintura":"68","cadera":"94","largo_manga":"58","talle_frente":"40","talle_espalda":"39","hombros":"38","largo_pantalon":"","tiro":"","cuello":"34"}', 'Vestido para promoción'),
('Jorge Sánchez Castro', '945781236', '41239876', 'Calle Comercio 88, Catacaos',
 '{"pecho":"108","cintura":"96","cadera":"104","largo_manga":"64","talle_frente":"46","talle_espalda":"48","hombros":"48","largo_pantalon":"106","tiro":"29","cuello":"42"}', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO public.rentals_inventory (code, name, category, size, color, rental_price, guarantee_price, status) VALUES
('TRN-001', 'Terno Clásico Azul Marino', 'Terno Completo', '40', 'Azul marino', 120.00, 150.00, 'Disponible'),
('TRN-002', 'Terno Slim Negro',          'Terno Completo', '38', 'Negro',        130.00, 150.00, 'Disponible'),
('TRN-003', 'Terno Gris Oxford',         'Terno Completo', '42', 'Gris',         110.00, 120.00, 'Disponible'),
('VST-001', 'Vestido de Gala Esmeralda', 'Vestido de Gala','S',  'Verde',        150.00, 200.00, 'Disponible'),
('VST-002', 'Vestido Sirena Vino',       'Vestido de Gala','M',  'Vino',         160.00, 200.00, 'Disponible'),
('SAC-001', 'Saco Beige Lino',           'Saco',           '40', 'Beige',         60.00,  80.00, 'Disponible'),
('CAM-001', 'Camisa Blanca Cuello Italiano','Camisa',      'M',  'Blanco',        25.00,  30.00, 'Disponible'),
('ACC-001', 'Corbata Seda + Pañuelo',    'Accesorios',     'Única','Vino',        15.00,  20.00, 'Disponible')
ON CONFLICT (code) DO NOTHING;
