-- =============================================================================
-- GetNear V1 — Seed Categories
-- Migration: 004_seed_categories.sql
-- Description: Seeds the categories table with 8 top-level parent categories
--              and subcategories for Food, Services, Healthcare, Shops,
--              Education, and Entertainment.
--              Uses gen_random_uuid() for IDs and references parent categories
--              by slug via subquery.
--              Uses INSERT ... ON CONFLICT (slug) DO NOTHING for idempotency.
-- Requirements: 2.5, 10.5
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Top-Level Categories (parent_id = NULL)
-- ---------------------------------------------------------------------------

INSERT INTO categories (id, name, slug, icon, color, parent_id, display_order, is_active)
VALUES
  (gen_random_uuid(), 'Food',          'food',          '🍽️',  '#FF6B35', NULL, 1, true),
  (gen_random_uuid(), 'Services',      'services',      '🔧',  '#4ECDC4', NULL, 2, true),
  (gen_random_uuid(), 'Healthcare',    'healthcare',    '🏥',  '#FF4757', NULL, 3, true),
  (gen_random_uuid(), 'Shops',         'shops',         '🛍️',  '#A29BFE', NULL, 4, true),
  (gen_random_uuid(), 'ATM',           'atm',           '🏧',  '#00B894', NULL, 5, true),
  (gen_random_uuid(), 'Education',     'education',     '📚',  '#FDCB6E', NULL, 6, true),
  (gen_random_uuid(), 'Entertainment', 'entertainment', '🎭',  '#E17055', NULL, 7, true),
  (gen_random_uuid(), 'Travel',        'travel',        '✈️',  '#74B9FF', NULL, 8, true)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Subcategories — Food
-- ---------------------------------------------------------------------------

INSERT INTO categories (id, name, slug, icon, color, parent_id, display_order, is_active)
VALUES
  (gen_random_uuid(), 'Restaurants', 'restaurants', '🍴', '#FF6B35', (SELECT id FROM categories WHERE slug = 'food'), 1, true),
  (gen_random_uuid(), 'Cafes',       'cafes',       '☕', '#FF6B35', (SELECT id FROM categories WHERE slug = 'food'), 2, true),
  (gen_random_uuid(), 'Bakeries',    'bakeries',    '🥐', '#FF6B35', (SELECT id FROM categories WHERE slug = 'food'), 3, true),
  (gen_random_uuid(), 'Street Food', 'street-food', '🌮', '#FF6B35', (SELECT id FROM categories WHERE slug = 'food'), 4, true),
  (gen_random_uuid(), 'Fast Food',   'fast-food',   '🍔', '#FF6B35', (SELECT id FROM categories WHERE slug = 'food'), 5, true)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Subcategories — Services
-- ---------------------------------------------------------------------------

INSERT INTO categories (id, name, slug, icon, color, parent_id, display_order, is_active)
VALUES
  (gen_random_uuid(), 'Salons',   'salons',   '💇', '#4ECDC4', (SELECT id FROM categories WHERE slug = 'services'), 1, true),
  (gen_random_uuid(), 'Gyms',     'gyms',     '🏋️', '#4ECDC4', (SELECT id FROM categories WHERE slug = 'services'), 2, true),
  (gen_random_uuid(), 'Laundry',  'laundry',  '👕', '#4ECDC4', (SELECT id FROM categories WHERE slug = 'services'), 3, true),
  (gen_random_uuid(), 'Repairs',  'repairs',  '🔨', '#4ECDC4', (SELECT id FROM categories WHERE slug = 'services'), 4, true),
  (gen_random_uuid(), 'Cleaning', 'cleaning', '🧹', '#4ECDC4', (SELECT id FROM categories WHERE slug = 'services'), 5, true)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Subcategories — Healthcare
-- ---------------------------------------------------------------------------

INSERT INTO categories (id, name, slug, icon, color, parent_id, display_order, is_active)
VALUES
  (gen_random_uuid(), 'Hospitals',   'hospitals',   '🏨', '#FF4757', (SELECT id FROM categories WHERE slug = 'healthcare'), 1, true),
  (gen_random_uuid(), 'Pharmacies',  'pharmacies',  '💊', '#FF4757', (SELECT id FROM categories WHERE slug = 'healthcare'), 2, true),
  (gen_random_uuid(), 'Clinics',     'clinics',     '🩺', '#FF4757', (SELECT id FROM categories WHERE slug = 'healthcare'), 3, true),
  (gen_random_uuid(), 'Dentists',    'dentists',    '🦷', '#FF4757', (SELECT id FROM categories WHERE slug = 'healthcare'), 4, true),
  (gen_random_uuid(), 'Opticians',   'opticians',   '👓', '#FF4757', (SELECT id FROM categories WHERE slug = 'healthcare'), 5, true)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Subcategories — Shops
-- ---------------------------------------------------------------------------

INSERT INTO categories (id, name, slug, icon, color, parent_id, display_order, is_active)
VALUES
  (gen_random_uuid(), 'Grocery',     'grocery',     '🛒', '#A29BFE', (SELECT id FROM categories WHERE slug = 'shops'), 1, true),
  (gen_random_uuid(), 'Electronics', 'electronics', '📱', '#A29BFE', (SELECT id FROM categories WHERE slug = 'shops'), 2, true),
  (gen_random_uuid(), 'Clothing',    'clothing',    '👗', '#A29BFE', (SELECT id FROM categories WHERE slug = 'shops'), 3, true),
  (gen_random_uuid(), 'Books',       'books',       '📖', '#A29BFE', (SELECT id FROM categories WHERE slug = 'shops'), 4, true),
  (gen_random_uuid(), 'Hardware',    'hardware',    '🔩', '#A29BFE', (SELECT id FROM categories WHERE slug = 'shops'), 5, true)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Subcategories — Education
-- ---------------------------------------------------------------------------

INSERT INTO categories (id, name, slug, icon, color, parent_id, display_order, is_active)
VALUES
  (gen_random_uuid(), 'Schools',   'schools',   '🏫', '#FDCB6E', (SELECT id FROM categories WHERE slug = 'education'), 1, true),
  (gen_random_uuid(), 'Colleges',  'colleges',  '🎓', '#FDCB6E', (SELECT id FROM categories WHERE slug = 'education'), 2, true),
  (gen_random_uuid(), 'Coaching',  'coaching',  '📝', '#FDCB6E', (SELECT id FROM categories WHERE slug = 'education'), 3, true),
  (gen_random_uuid(), 'Libraries', 'libraries', '📚', '#FDCB6E', (SELECT id FROM categories WHERE slug = 'education'), 4, true)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Subcategories — Entertainment
-- ---------------------------------------------------------------------------

INSERT INTO categories (id, name, slug, icon, color, parent_id, display_order, is_active)
VALUES
  (gen_random_uuid(), 'Cinemas', 'cinemas', '🎬', '#E17055', (SELECT id FROM categories WHERE slug = 'entertainment'), 1, true),
  (gen_random_uuid(), 'Parks',   'parks',   '🌳', '#E17055', (SELECT id FROM categories WHERE slug = 'entertainment'), 2, true),
  (gen_random_uuid(), 'Gaming',  'gaming',  '🎮', '#E17055', (SELECT id FROM categories WHERE slug = 'entertainment'), 3, true),
  (gen_random_uuid(), 'Events',  'events',  '🎪', '#E17055', (SELECT id FROM categories WHERE slug = 'entertainment'), 4, true)
ON CONFLICT (slug) DO NOTHING;
