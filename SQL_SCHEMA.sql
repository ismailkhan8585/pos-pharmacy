-- ==============================================================================
-- AN MEDCARE PHARMACY POS — SUPABASE POSTGRESQL SCHEMA & STORED PROCEDURES
-- Pharmacist / Owner: Adil Nawaz | Location: Swabi, KPK, Pakistan
-- Currency: PKR (Rs.) | System: Next.js Hybrid PWA Standalone POS
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default Settings Seed
INSERT INTO public.settings (key, value) VALUES
    ('store_name', 'AN MedCare'),
    ('store_name_ur', 'اے این میڈ کیئر'),
    ('owner_name', 'Adil Nawaz'),
    ('phone', '0300-1234567'),
    ('whatsapp', '0300-1234567'),
    ('address', 'Main Bazar, Swabi, KPK, Pakistan'),
    ('drug_license', 'DL-KPK-SWB-2026'),
    ('pin_hash', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'), -- SHA-256 for default PIN: 1234
    ('receipt_footer', 'Get well soon! Thank you for choosing AN MedCare'),
    ('receipt_font_size', 'medium'),
    ('show_drug_license', 'true'),
    ('currency_symbol', 'Rs.'),
    ('default_low_stock', '10'),
    ('expiry_warning_days', '30'),
    ('auto_lock_minutes', '240'),
    ('enable_cash', 'true'),
    ('enable_jazzcash', 'true'),
    ('jazzcash_number', '0300-1234567'),
    ('enable_easypaisa', 'true'),
    ('easypaisa_number', '0345-1234567'),
    ('enable_store', 'true'),
    ('tax_enabled', 'false'),
    ('tax_rate', '0')
ON CONFLICT (key) DO NOTHING;

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en TEXT NOT NULL,
    name_ur TEXT,
    icon TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Categories
INSERT INTO public.categories (name_en, name_ur, icon, sort_order) VALUES
    ('Analgesics & Pain Relief', 'درد کش ادویات', 'Pill', 1),
    ('Antibiotics & Anti-Infective', 'اینٹی بائیوٹکس', 'ShieldAlert', 2),
    ('Gastrointestinal & Antacids', 'معدہ اور ہاضمہ', 'Flame', 3),
    ('Cardiovascular & Blood Pressure', 'امراض قلب و بلڈ پریشر', 'HeartPulse', 4),
    ('Respiratory, Cough & Cold', 'کھانسی اور سانس', 'Wind', 5),
    ('Anti-Diabetic', 'ذیابیطس / شوگر', 'Activity', 6),
    ('Vitamins & Supplements', 'وٹامنز اور ملٹی وٹامنز', 'Sparkles', 7),
    ('Dermatology & Skin Care', 'جلدی امراض', 'Layers', 8),
    ('Medical Devices & First Aid', 'طبی آلات اور پٹیاں', 'Bandage', 9),
    ('Baby & Mother Care', 'بچوں اور ماؤں کی نگہداشت', 'Baby', 10)
ON CONFLICT DO NOTHING;

-- 3. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en TEXT NOT NULL,
    name_ur TEXT,
    brand TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    barcode TEXT UNIQUE,
    sku TEXT,
    sell_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cost_price NUMERIC(12, 2) DEFAULT 0.00,
    stock NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    low_stock_at INT DEFAULT 10,
    unit TEXT DEFAULT 'pcs',
    requires_prescription BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table was already created
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name_en);

-- 4. PRODUCT BATCHES & EXPIRY
CREATE TABLE IF NOT EXISTS public.product_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    batch_number TEXT,
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cost_price NUMERIC(12, 2) DEFAULT 0.00,
    expiry_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batches_product ON public.product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON public.product_batches(expiry_date);

-- 5. SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    whatsapp TEXT,
    address TEXT,
    city TEXT DEFAULT 'Swabi',
    credit_terms TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed KPK / Swabi Distributors
INSERT INTO public.suppliers (name, phone, whatsapp, address, city, credit_terms) VALUES
    ('Khyber Pharma Distributors', '091-5840001', '0300-5840001', 'University Road, Peshawar', 'Peshawar', '15 Days'),
    ('Swabi Medical Store & Wholesale', '0938-221100', '0313-9876543', 'Karnal Sher Khan Chowk, Swabi', 'Swabi', 'Cash / 7 Days'),
    ('Mardan Pharma Agencies', '0937-862211', '0333-9123456', 'Bank Road, Mardan', 'Mardan', '30 Days'),
    ('Abbott Laboratories Pakistan', '021-111222688', '0300-8226880', 'Plot 29, Korangi, Karachi', 'Karachi', '15 Days')
ON CONFLICT DO NOTHING;

-- 6. PURCHASES & PURCHASE ITEMS
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_number TEXT UNIQUE NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    supplier_name TEXT,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method TEXT DEFAULT 'Cash',
    payment_status TEXT DEFAULT 'Paid',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 1.00,
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    batch_number TEXT,
    expiry_date DATE
);

-- 7. SHIFTS TABLE
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_number TEXT,
    operator_name TEXT NOT NULL DEFAULT 'Adil Nawaz',
    status TEXT NOT NULL DEFAULT 'OPEN', -- 'OPEN' or 'CLOSED'
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    opening_cash NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    closing_cash NUMERIC(12, 2),
    expected_cash NUMERIC(12, 2),
    cash_difference NUMERIC(12, 2),
    total_sales NUMERIC(12, 2) DEFAULT 0.00,
    total_bills INT DEFAULT 0,
    total_discount NUMERIC(12, 2) DEFAULT 0.00,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_shifts_status ON public.shifts(status);

-- 8. SALES & SALE ITEMS
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT UNIQUE NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    discount_type TEXT DEFAULT 'rs',
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method TEXT NOT NULL DEFAULT 'Cash',
    cash_received NUMERIC(12, 2),
    change_given NUMERIC(12, 2),
    customer_name TEXT,
    customer_phone TEXT,
    notes TEXT,
    shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
    sale_source TEXT DEFAULT 'POS',
    offline_sale_id TEXT UNIQUE,
    synced_at TIMESTAMPTZ,
    is_returned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_receipt ON public.sales(receipt_number);
CREATE INDEX IF NOT EXISTS idx_sales_created ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_offline_id ON public.sales(offline_sale_id);

CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    product_name_ur TEXT,
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON public.sale_items(product_id);

-- 9. RETURNS & RETURN ITEMS
CREATE TABLE IF NOT EXISTS public.returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_receipt TEXT UNIQUE NOT NULL,
    original_sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
    original_receipt TEXT,
    customer_name TEXT,
    refund_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    refund_method TEXT DEFAULT 'Cash',
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

-- 10. STOCK LEDGER (AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS public.stock_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    product_name TEXT,
    action_type TEXT NOT NULL, -- 'SALE', 'PURCHASE', 'RETURN', 'ADJUSTMENT', 'STOCK_COUNT'
    quantity NUMERIC(12, 2) NOT NULL,
    balance_after NUMERIC(12, 2) NOT NULL,
    reference_type TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_product ON public.stock_ledger(product_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created ON public.stock_ledger(created_at);

-- ==============================================================================
-- STORED PROCEDURES (RPCs)
-- ==============================================================================

-- RPC: Deduct Stock on Sale
CREATE OR REPLACE FUNCTION public.deduct_stock(
    p_product_id UUID,
    p_quantity NUMERIC,
    p_sale_id UUID,
    p_receipt TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_stock NUMERIC;
    v_new_stock NUMERIC;
    v_product_name TEXT;
BEGIN
    SELECT stock, name_en INTO v_current_stock, v_product_name
    FROM public.products
    WHERE id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product with ID % not found', p_product_id;
    END IF;

    v_new_stock := v_current_stock - p_quantity;

    UPDATE public.products
    SET stock = v_new_stock,
        updated_at = NOW()
    WHERE id = p_product_id;

    INSERT INTO public.stock_ledger (
        product_id,
        product_name,
        action_type,
        quantity,
        balance_after,
        reference_type,
        notes
    ) VALUES (
        p_product_id,
        v_product_name,
        'SALE',
        -p_quantity,
        v_new_stock,
        p_receipt,
        'POS Sale ' || p_receipt
    );
END;
$$;

-- RPC: Restore Stock on Return
CREATE OR REPLACE FUNCTION public.restore_stock(
    p_product_id UUID,
    p_quantity NUMERIC,
    p_return_receipt TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_stock NUMERIC;
    v_new_stock NUMERIC;
    v_product_name TEXT;
BEGIN
    SELECT stock, name_en INTO v_current_stock, v_product_name
    FROM public.products
    WHERE id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product with ID % not found', p_product_id;
    END IF;

    v_new_stock := v_current_stock + p_quantity;

    UPDATE public.products
    SET stock = v_new_stock,
        updated_at = NOW()
    WHERE id = p_product_id;

    INSERT INTO public.stock_ledger (
        product_id,
        product_name,
        action_type,
        quantity,
        balance_after,
        reference_type,
        notes
    ) VALUES (
        p_product_id,
        v_product_name,
        'RETURN',
        p_quantity,
        v_new_stock,
        p_return_receipt,
        'Customer Return ' || p_return_receipt
    );
END;
$$;

-- RPC: Add Stock on Purchase
CREATE OR REPLACE FUNCTION public.add_stock(
    p_product_id UUID,
    p_quantity NUMERIC,
    p_purchase_number TEXT,
    p_cost_price NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_stock NUMERIC;
    v_new_stock NUMERIC;
    v_product_name TEXT;
BEGIN
    SELECT stock, name_en INTO v_current_stock, v_product_name
    FROM public.products
    WHERE id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product with ID % not found', p_product_id;
    END IF;

    v_new_stock := v_current_stock + p_quantity;

    UPDATE public.products
    SET stock = v_new_stock,
        cost_price = CASE WHEN p_cost_price > 0 THEN p_cost_price ELSE cost_price END,
        updated_at = NOW()
    WHERE id = p_product_id;

    INSERT INTO public.stock_ledger (
        product_id,
        product_name,
        action_type,
        quantity,
        balance_after,
        reference_type,
        notes
    ) VALUES (
        p_product_id,
        v_product_name,
        'PURCHASE',
        p_quantity,
        v_new_stock,
        p_purchase_number,
        'Stock Received via ' || p_purchase_number
    );
END;
$$;

-- ==============================================================================
-- INITIAL MEDICINE CATALOG SEED (Popular in Swabi, KPK, Pakistan)
-- ==============================================================================

DO $$
DECLARE
    cat_analgesic UUID;
    cat_antibiotic UUID;
    cat_gastro UUID;
    cat_cardio UUID;
    cat_resp UUID;
    cat_diabetes UUID;
    cat_vitamins UUID;
BEGIN
    SELECT id INTO cat_analgesic FROM public.categories WHERE name_en LIKE 'Analgesics%' LIMIT 1;
    SELECT id INTO cat_antibiotic FROM public.categories WHERE name_en LIKE 'Antibiotics%' LIMIT 1;
    SELECT id INTO cat_gastro FROM public.categories WHERE name_en LIKE 'Gastrointestinal%' LIMIT 1;
    SELECT id INTO cat_cardio FROM public.categories WHERE name_en LIKE 'Cardiovascular%' LIMIT 1;
    SELECT id INTO cat_resp FROM public.categories WHERE name_en LIKE 'Respiratory%' LIMIT 1;
    SELECT id INTO cat_diabetes FROM public.categories WHERE name_en LIKE 'Anti-Diabetic%' LIMIT 1;
    SELECT id INTO cat_vitamins FROM public.categories WHERE name_en LIKE 'Vitamins%' LIMIT 1;

    INSERT INTO public.products (name_en, name_ur, brand, category_id, barcode, sku, sell_price, cost_price, stock, low_stock_at, unit, requires_prescription) VALUES
    ('Panadol 500mg Tablets (Strip of 10)', 'پیناڈول ۵۰۰ ملی گرام', 'GSK', cat_analgesic, '8964000120011', 'PAN-500-10', 40.00, 32.00, 150, 20, 'strip', false),
    ('Panadol Extra Tablets (Strip of 10)', 'پیناڈول ایکسٹرا', 'GSK', cat_analgesic, '8964000120028', 'PAN-EXT-10', 65.00, 52.00, 100, 15, 'strip', false),
    ('Brufen 400mg Tablets (Strip of 10)', 'بروفین ۴۰۰ ملی گرام', 'Abbott', cat_analgesic, '8964000210033', 'BRU-400-10', 50.00, 40.00, 80, 15, 'strip', false),
    ('Disprin 300mg Soluble Tablets', 'ڈسپرین', 'Reckitt', cat_analgesic, '8964000300048', 'DIS-300-10', 35.00, 28.00, 120, 20, 'strip', false),
    ('Ponstan Forte 500mg (Strip of 10)', 'پونسٹان فورٹ', 'Pfizer', cat_analgesic, '8964000450055', 'PON-500-10', 70.00, 56.00, 60, 10, 'strip', false),
    ('Augmentin 625mg Tablets (Pack of 10)', 'اگمنٹن ۶۲۵ ملی گرام', 'GSK', cat_antibiotic, '8964000560062', 'AUG-625-10', 340.00, 280.00, 45, 10, 'pack', true),
    ('Amoxil 500mg Capsules (Strip of 10)', 'اموکسل ۵۰۰ ملی گرام', 'GSK', cat_antibiotic, '8964000670079', 'AMX-500-10', 120.00, 96.00, 50, 10, 'strip', true),
    ('Ciproxin 500mg Tablets (Pack of 10)', 'سِپروکسن ۵۰۰ ملی گرام', 'Bayer', cat_antibiotic, '8964000780086', 'CIP-500-10', 450.00, 370.00, 30, 8, 'pack', true),
    ('Flagyl 400mg Tablets (Strip of 10)', 'فلیجل ۴۰۰ ملی گرام', 'Sanofi', cat_antibiotic, '8964000890093', 'FLG-400-10', 45.00, 36.00, 90, 15, 'strip', false),
    ('Risek 20mg Capsules (Strip of 14)', 'رائزک ۲۰ ملی گرام', 'Getz Pharma', cat_gastro, '8964000910109', 'RSK-20-14', 380.00, 310.00, 75, 15, 'strip', false),
    ('Risek 40mg Capsules (Strip of 14)', 'رائزک ۴۰ ملی گرام', 'Getz Pharma', cat_gastro, '8964000910116', 'RSK-40-14', 550.00, 450.00, 40, 10, 'strip', false),
    ('Gaviscon Syrup 120ml Mint', 'گیوسکان سیرپ', 'Reckitt', cat_gastro, '8964001020123', 'GAV-SYR-120', 195.00, 160.00, 35, 8, 'bottle', false),
    ('Loprin 75mg Tablets (Pack of 30)', 'لوپرن ۷۵ ملی گرام', 'Atco', cat_cardio, '8964001130130', 'LOP-75-30', 90.00, 72.00, 85, 15, 'pack', false),
    ('Tenormin 50mg Tablets (Pack of 14)', 'ٹینورمین ۵۰ ملی گرام', 'ICI', cat_cardio, '8964001240147', 'TEN-50-14', 180.00, 145.00, 40, 10, 'pack', true),
    ('Arinac Forte Tablets (Strip of 10)', 'ایرینیک فورٹ', 'Abbott', cat_resp, '8964001350154', 'ARN-FORTE-10', 85.00, 68.00, 110, 20, 'strip', false),
    ('Ventolin Inhaler 100mcg', 'وینٹولن انہیلر', 'GSK', cat_resp, '8964001460161', 'VEN-INH-100', 320.00, 260.00, 30, 8, 'pcs', true),
    ('Glucophage 500mg (Pack of 50)', 'گلوکوفیج ۵۰۰ ملی گرام', 'Merck', cat_diabetes, '8964001570178', 'GLU-500-50', 210.00, 170.00, 50, 10, 'pack', true),
    ('Getryl 2mg Tablets (Pack of 20)', 'گیٹریل ۲ ملی گرام', 'Getz Pharma', cat_diabetes, '8964001680185', 'GET-2-20', 160.00, 130.00, 45, 10, 'pack', true),
    ('Surbex-Z High Potency Tablets', 'سربیکس زی', 'Abbott', cat_vitamins, '8964001790192', 'SRB-Z-30', 290.00, 235.00, 65, 12, 'bottle', false),
    ('CAC 1000 Plus Effervescent Tablets', 'سی اے سی ۱۰۰۰ پلس', 'Novartis', cat_vitamins, '8964001800208', 'CAC-1000-20', 380.00, 310.00, 55, 12, 'tube', false)
    ON CONFLICT (barcode) DO NOTHING;
END $$;

-- Enable Row Level Security (RLS) but allow anonymous access for Counter POS client
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_ledger ENABLE ROW LEVEL SECURITY;

-- Allow anon full read/write policy for counter operations (with anon key in .env.local)
CREATE POLICY "Allow anon all on settings" ON public.settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on categories" ON public.categories FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on products" ON public.products FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on product_batches" ON public.product_batches FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on suppliers" ON public.suppliers FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on purchases" ON public.purchases FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on purchase_items" ON public.purchase_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on shifts" ON public.shifts FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on sales" ON public.sales FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on sale_items" ON public.sale_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on returns" ON public.returns FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on return_items" ON public.return_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on stock_ledger" ON public.stock_ledger FOR ALL TO anon USING (true) WITH CHECK (true);
