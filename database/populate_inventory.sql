-- =============================================================
-- ESC-kho WMS — Populate esc_inventory từ data PO/SO thực tế
-- Supabase project: jhebreoxwuimlqwvjdok.supabase.co
-- Chạy trong Supabase SQL Editor
-- =============================================================
-- MỤC ĐÍCH:
--   Tính toán tồn kho theo từng ngày từ dữ liệu giao dịch PO/SO thực tế
--   và insert/upsert vào bảng esc_inventory.
--
-- LOGIC TÍNH TOÁN:
--   received_qty  = SUM số lượng nhập (từ esc_po_items, PO status='received' hoặc 'partial')
--   delivered_qty = SUM số lượng xuất (từ esc_so_items, SO status IN shipped/completed/returned)
--   adjusted_qty  = SUM điều chỉnh kiểm kê (từ esc_stock_movement type='adjust')
--   intransit_qty = SUM đang vận chuyển (từ esc_stock_movement type='transfer' chưa completed)
--   start_qty     = available_qty của ngày hôm trước (hoặc 0 nếu là ngày đầu tiên)
--   available_qty = start_qty + received_qty - delivered_qty + adjusted_qty
--
-- WH_CODE MẶC ĐỊNH: 'ESC-MAIN' — nếu chưa có kho, script sẽ tự tạo
-- WEBSITE_ID: 9
-- =============================================================


-- BƯỚC 0: Tạo kho mặc định nếu chưa tồn tại
INSERT INTO esc_warehouse (wh_code, wh_name, wh_address, is_active, website_id)
VALUES ('ESC-MAIN', 'Kho chính ESC', 'TP. Hồ Chí Minh', TRUE, ARRAY[9])
ON CONFLICT (wh_code) DO NOTHING;


-- BƯỚC 1: Tạo bảng tạm chứa tổng nhập theo (product_code, ngày nhập)
-- Nguồn: esc_po_items JOIN esc_po (status received hoặc partial)
WITH
po_daily AS (
  SELECT
    pi.product_code,
    COALESCE(p.actual_delivery, p.order_date) AS trans_date,
    SUM(pi.received_qty)                        AS received_qty
  FROM esc_po_items pi
  JOIN esc_po p ON p.po_code = pi.po_code
  WHERE
    p.status IN ('received', 'partial')
    AND p.website_id @> ARRAY[9]
  GROUP BY pi.product_code, COALESCE(p.actual_delivery, p.order_date)
),

-- BƯỚC 2: Tổng xuất theo (product_code, ngày xuất)
-- Nguồn: esc_so_items JOIN esc_so (status shipped/completed/returned)
so_daily AS (
  SELECT
    si.product_code,
    COALESCE(s.shipped_date, s.order_date) AS trans_date,
    SUM(si.shipped_qty)                     AS delivered_qty
  FROM esc_so_items si
  JOIN esc_so s ON s.so_code = si.so_code
  WHERE
    s.status IN ('shipped', 'completed', 'returned')
    AND s.website_id @> ARRAY[9]
  GROUP BY si.product_code, COALESCE(s.shipped_date, s.order_date)
),

-- BƯỚC 3: Điều chỉnh kiểm kê theo ngày (từ stock_movement type=adjust)
adjust_daily AS (
  SELECT
    product_code,
    moved_at::DATE AS trans_date,
    SUM(qty)       AS adjusted_qty
  FROM esc_stock_movement
  WHERE
    movement_type = 'adjust'
    AND website_id @> ARRAY[9]
  GROUP BY product_code, moved_at::DATE
),

-- BƯỚC 4: Tồn kho đang vận chuyển (transfer chưa completed)
intransit_daily AS (
  SELECT
    sm.product_code,
    sm.moved_at::DATE AS trans_date,
    SUM(sm.qty)       AS intransit_qty
  FROM esc_stock_movement sm
  JOIN esc_stock_transfer st ON st.transfer_code = sm.ref_code
  WHERE
    sm.movement_type = 'transfer'
    AND st.status NOT IN ('completed')
    AND sm.website_id @> ARRAY[9]
  GROUP BY sm.product_code, sm.moved_at::DATE
),

-- BƯỚC 5: Gộp tất cả ngày giao dịch theo từng sản phẩm
all_dates AS (
  SELECT product_code, trans_date FROM po_daily
  UNION
  SELECT product_code, trans_date FROM so_daily
  UNION
  SELECT product_code, trans_date FROM adjust_daily
  UNION
  SELECT product_code, trans_date FROM intransit_daily
),

-- BƯỚC 6: Join tất cả nguồn dữ liệu vào từng dòng (product_code, trans_date)
daily_combined AS (
  SELECT
    ad.product_code,
    ad.trans_date,
    COALESCE(po.received_qty,  0) AS received_qty,
    COALESCE(so.delivered_qty, 0) AS delivered_qty,
    COALESCE(aj.adjusted_qty,  0) AS adjusted_qty,
    COALESCE(it.intransit_qty, 0) AS intransit_qty
  FROM all_dates ad
  LEFT JOIN po_daily       po ON po.product_code = ad.product_code AND po.trans_date = ad.trans_date
  LEFT JOIN so_daily       so ON so.product_code = ad.product_code AND so.trans_date = ad.trans_date
  LEFT JOIN adjust_daily   aj ON aj.product_code = ad.product_code AND aj.trans_date = ad.trans_date
  LEFT JOIN intransit_daily it ON it.product_code = ad.product_code AND it.trans_date = ad.trans_date
),

-- BƯỚC 7: Tính start_qty (tồn cuối ngày trước) và available_qty bằng window function
daily_with_running AS (
  SELECT
    product_code,
    trans_date,
    received_qty,
    delivered_qty,
    adjusted_qty,
    intransit_qty,
    -- start_qty = tích lũy (received - delivered + adjusted) của tất cả ngày TRƯỚC đó
    GREATEST(0,
      SUM(received_qty - delivered_qty + adjusted_qty)
      OVER (
        PARTITION BY product_code
        ORDER BY trans_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      )
    ) AS start_qty,
    -- available_qty = tích lũy đến hết ngày hiện tại
    GREATEST(0,
      SUM(received_qty - delivered_qty + adjusted_qty)
      OVER (
        PARTITION BY product_code
        ORDER BY trans_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      )
    ) AS available_qty
  FROM daily_combined
)

-- BƯỚC 8: Upsert vào esc_inventory
-- Nếu đã có bản ghi (product_code, wh_code, trans_date) → UPDATE
-- Nếu chưa có → INSERT
INSERT INTO esc_inventory (
  product_code,
  wh_code,
  location_code,
  trans_date,
  start_qty,
  received_qty,
  delivered_qty,
  adjusted_qty,
  intransit_qty,
  available_qty,
  website_id
)
SELECT
  r.product_code,
  'ESC-MAIN'     AS wh_code,
  NULL           AS location_code,
  r.trans_date,
  COALESCE(r.start_qty,     0),
  r.received_qty,
  r.delivered_qty,
  r.adjusted_qty,
  r.intransit_qty,
  r.available_qty,
  ARRAY[9]       AS website_id
FROM daily_with_running r
-- Chỉ insert sản phẩm thực sự tồn tại trong esc_product với website_id=9
WHERE EXISTS (
  SELECT 1 FROM esc_product p
  WHERE p.product_code = r.product_code
    AND p.website_id @> ARRAY[9]
)
ON CONFLICT (product_code, wh_code, trans_date)
DO UPDATE SET
  start_qty     = EXCLUDED.start_qty,
  received_qty  = EXCLUDED.received_qty,
  delivered_qty = EXCLUDED.delivered_qty,
  adjusted_qty  = EXCLUDED.adjusted_qty,
  intransit_qty = EXCLUDED.intransit_qty,
  available_qty = EXCLUDED.available_qty;


-- =============================================================
-- BƯỚC 9 (TÙY CHỌN): Tạo snapshot "hôm nay" cho những SP có tồn kho
-- nhưng không có giao dịch hôm nay — giúp InventoryReport luôn thấy
-- tồn kho hiện tại dù SP không có giao dịch mới.
-- =============================================================
INSERT INTO esc_inventory (
  product_code,
  wh_code,
  location_code,
  trans_date,
  start_qty,
  received_qty,
  delivered_qty,
  adjusted_qty,
  intransit_qty,
  available_qty,
  website_id
)
SELECT
  latest.product_code,
  'ESC-MAIN',
  NULL,
  CURRENT_DATE,
  latest.available_qty, -- tồn cuối ngày gần nhất = tồn đầu hôm nay
  0,
  0,
  0,
  0,
  latest.available_qty, -- chưa có giao dịch hôm nay → tồn cuối = tồn đầu
  ARRAY[9]
FROM (
  -- Lấy bản ghi mới nhất của mỗi sản phẩm
  SELECT DISTINCT ON (product_code)
    product_code,
    available_qty
  FROM esc_inventory
  WHERE
    website_id @> ARRAY[9]
    AND wh_code = 'ESC-MAIN'
    AND trans_date < CURRENT_DATE   -- chỉ lấy ngày trước hôm nay
    AND available_qty > 0           -- chỉ SP còn tồn kho
  ORDER BY product_code, trans_date DESC
) latest
-- Chỉ thêm nếu hôm nay chưa có bản ghi
WHERE NOT EXISTS (
  SELECT 1 FROM esc_inventory i
  WHERE i.product_code = latest.product_code
    AND i.wh_code      = 'ESC-MAIN'
    AND i.trans_date   = CURRENT_DATE
)
ON CONFLICT (product_code, wh_code, trans_date) DO NOTHING;


-- =============================================================
-- KIỂM TRA KẾT QUẢ
-- =============================================================
SELECT
  product_code,
  trans_date,
  start_qty,
  received_qty,
  delivered_qty,
  adjusted_qty,
  available_qty
FROM esc_inventory
WHERE website_id @> ARRAY[9]
ORDER BY product_code, trans_date DESC
LIMIT 50;
