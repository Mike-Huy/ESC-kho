-- =============================================================
-- ESC-kho WMS — Road Map Module
-- Chạy trong Supabase SQL Editor (idempotent)
-- =============================================================

-- ── 1. Projects ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS esc_roadmap_projects (
  id          BIGSERIAL PRIMARY KEY,
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'planning'
                CHECK (status IN ('planning','active','on_hold','completed','cancelled')),
  start_date  DATE,
  end_date    DATE,
  owner       TEXT,
  budget      NUMERIC(18,0),
  progress    INT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  color       TEXT NOT NULL DEFAULT '#3b82f6',
  website_id  INT[] NOT NULL DEFAULT ARRAY[9],
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Milestones ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS esc_roadmap_milestones (
  id          BIGSERIAL PRIMARY KEY,
  project_id  BIGINT NOT NULL REFERENCES esc_roadmap_projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  due_date    DATE,
  status      TEXT NOT NULL DEFAULT 'todo'
                CHECK (status IN ('todo','in_progress','done','overdue')),
  owner       TEXT,
  budget      NUMERIC(18,0),
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Tasks ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS esc_roadmap_tasks (
  id           BIGSERIAL PRIMARY KEY,
  milestone_id BIGINT NOT NULL REFERENCES esc_roadmap_milestones(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  owner        TEXT,
  status       TEXT NOT NULL DEFAULT 'todo'
                 CHECK (status IN ('todo','in_progress','done')),
  due_date     DATE,
  budget       NUMERIC(18,0),
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. Settings (1 row per website) ──────────────────────────
CREATE TABLE IF NOT EXISTS esc_roadmap_settings (
  id               BIGSERIAL PRIMARY KEY,
  website_id       INT NOT NULL UNIQUE,
  permissions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Seed settings mặc định cho website_id=9
INSERT INTO esc_roadmap_settings (website_id, permissions_json)
VALUES (9, '{
  "projects": {
    "super_admin": {"can_read":true,"can_add":true,"can_edit":true,"can_delete":true},
    "admin":       {"can_read":true,"can_add":true,"can_edit":true,"can_delete":true},
    "leader":      {"can_read":true,"can_add":false,"can_edit":false,"can_delete":false},
    "staff":       {"can_read":true,"can_add":false,"can_edit":false,"can_delete":false},
    "customer":    {"can_read":false,"can_add":false,"can_edit":false,"can_delete":false}
  },
  "roadmap": {
    "super_admin": {"can_read":true,"can_add":true,"can_edit":true,"can_delete":true},
    "admin":       {"can_read":true,"can_add":true,"can_edit":true,"can_delete":true},
    "leader":      {"can_read":true,"can_add":false,"can_edit":false,"can_delete":false},
    "staff":       {"can_read":true,"can_add":false,"can_edit":false,"can_delete":false},
    "customer":    {"can_read":false,"can_add":false,"can_edit":false,"can_delete":false}
  },
  "budget": {
    "super_admin": {"can_read":true,"can_add":true,"can_edit":true,"can_delete":true},
    "admin":       {"can_read":true,"can_add":true,"can_edit":true,"can_delete":true},
    "leader":      {"can_read":false,"can_add":false,"can_edit":false,"can_delete":false},
    "staff":       {"can_read":false,"can_add":false,"can_edit":false,"can_delete":false},
    "customer":    {"can_read":false,"can_add":false,"can_edit":false,"can_delete":false}
  },
  "manage": {
    "super_admin": {"can_read":true,"can_add":true,"can_edit":true,"can_delete":true},
    "admin":       {"can_read":true,"can_add":true,"can_edit":true,"can_delete":false},
    "leader":      {"can_read":false,"can_add":false,"can_edit":false,"can_delete":false},
    "staff":       {"can_read":false,"can_add":false,"can_edit":false,"can_delete":false},
    "customer":    {"can_read":false,"can_add":false,"can_edit":false,"can_delete":false}
  }
}'::jsonb)
ON CONFLICT (website_id) DO UPDATE
  SET permissions_json = EXCLUDED.permissions_json;

-- ── 5. Seed demo data ─────────────────────────────────────────
INSERT INTO esc_roadmap_projects (code, name, description, status, start_date, end_date, owner, budget, progress, color, website_id)
VALUES
  ('ESC-WMS-01', 'Triển khai WMS Kho ESC',    'Hệ thống quản lý kho toàn diện cho Kho ESC',          'active',    '2025-01-01', '2025-12-31', 'Michael',   120000000, 65, '#3b82f6', ARRAY[9]),
  ('ESC-FIN-02', 'Module Tài chính v2',        'Nâng cấp module tài chính, tích hợp báo cáo tự động', 'planning',  '2025-07-01', '2025-10-31', 'Ha Giang',   45000000, 10, '#8b5cf6', ARRAY[9]),
  ('ESC-MOB-01', 'App Mobile Chấm công',       'Ứng dụng mobile cho nhân viên chấm công & xem lịch',  'on_hold',   '2025-04-01', '2025-09-30', 'Michael',    30000000, 35, '#f59e0b', ARRAY[9])
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  p1 BIGINT; p2 BIGINT; p3 BIGINT;
  m1 BIGINT; m2 BIGINT; m3 BIGINT;
BEGIN
  SELECT id INTO p1 FROM esc_roadmap_projects WHERE code = 'ESC-WMS-01' AND website_id @> ARRAY[9];
  SELECT id INTO p2 FROM esc_roadmap_projects WHERE code = 'ESC-FIN-02' AND website_id @> ARRAY[9];
  SELECT id INTO p3 FROM esc_roadmap_projects WHERE code = 'ESC-MOB-01' AND website_id @> ARRAY[9];

  IF p1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM esc_roadmap_milestones WHERE project_id = p1) THEN
    INSERT INTO esc_roadmap_milestones (project_id, title, description, due_date, status, owner, budget, sort_order)
    VALUES
      (p1, 'Phase 1 — Core WMS',          'Inbound, Outbound, Inventory cơ bản',           '2025-03-31', 'done',        'Michael',   40000000, 1),
      (p1, 'Phase 2 — HR & Finance',       'Module nhân sự, chấm công, lương',              '2025-06-30', 'in_progress', 'Ha Giang',  35000000, 2),
      (p1, 'Phase 3 — Road Map & Analytics','Dashboard nâng cao, Road Map, BI',             '2025-12-31', 'todo',        'Michael',   45000000, 3);

    SELECT id INTO m1 FROM esc_roadmap_milestones WHERE project_id = p1 AND sort_order = 1;
    SELECT id INTO m2 FROM esc_roadmap_milestones WHERE project_id = p1 AND sort_order = 2;
    SELECT id INTO m3 FROM esc_roadmap_milestones WHERE project_id = p1 AND sort_order = 3;

    INSERT INTO esc_roadmap_tasks (milestone_id, title, owner, status, due_date, budget, sort_order)
    VALUES
      (m1, 'Thiết kế DB schema',    'Michael',  'done',        '2025-01-15',  5000000, 1),
      (m1, 'Inbound Manager',       'Michael',  'done',        '2025-02-28', 15000000, 2),
      (m1, 'Outbound & Picking',    'Ha Giang', 'done',        '2025-03-31', 20000000, 3),
      (m2, 'StaffAdmin & Phân quyền','Michael', 'done',        '2025-04-30', 10000000, 1),
      (m2, 'Chấm công & Ca làm',    'Ha Giang', 'in_progress', '2025-05-31', 15000000, 2),
      (m2, 'Báo cáo lương',         'Ha Giang', 'todo',        '2025-06-30', 10000000, 3),
      (m3, 'Road Map module',       'Michael',  'in_progress', '2025-05-31', 15000000, 1),
      (m3, 'Analytics Dashboard',   'Ha Giang', 'todo',        '2025-09-30', 20000000, 2),
      (m3, 'Export & BI Reports',   'Ha Giang', 'todo',        '2025-12-31', 10000000, 3);
  END IF;
END $$;

-- ── 6. Kiểm tra ───────────────────────────────────────────────
SELECT 'projects' AS tbl, COUNT(*) FROM esc_roadmap_projects WHERE website_id @> ARRAY[9]
UNION ALL
SELECT 'milestones', COUNT(*) FROM esc_roadmap_milestones
UNION ALL
SELECT 'tasks',      COUNT(*) FROM esc_roadmap_tasks
UNION ALL
SELECT 'settings',   COUNT(*) FROM esc_roadmap_settings WHERE website_id = 9;
