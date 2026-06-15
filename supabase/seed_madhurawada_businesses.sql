-- =============================================================================
-- GetNear V1 — Seed Madhurawada Businesses
-- File: seed_madhurawada_businesses.sql
-- Description: Seeds the businesses and business_photos tables with real
--              business data from Madhurawada, Visakhapatnam area.
--              Uses satya.instawp.co hosted photos.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Step 0: Schema adjustments for seed data
-- ---------------------------------------------------------------------------

-- Allow NULL owner_id for platform-seeded listings
ALTER TABLE businesses ALTER COLUMN owner_id DROP NOT NULL;

-- Add 'public' type to businesses check constraint (for temples, bus stops, etc.)
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_type_check;
ALTER TABLE businesses ADD CONSTRAINT businesses_type_check
  CHECK (type IN ('physical', 'service', 'online', 'public'));

-- ---------------------------------------------------------------------------
-- Step 1: Insert missing categories (Devotional, Sports, Preschools)
-- ---------------------------------------------------------------------------
INSERT INTO categories (id, name, slug, icon, color, parent_id, display_order, is_active)
VALUES
  (gen_random_uuid(), 'Devotional', 'devotional', '🙏', '#F39C12', NULL, 9, true),
  (gen_random_uuid(), 'Sports', 'sports', '⚽', '#27AE60', NULL, 10, true)
ON CONFLICT (slug) DO NOTHING;

-- Subcategory: Preschools under Education
INSERT INTO categories (id, name, slug, icon, color, parent_id, display_order, is_active)
VALUES
  (gen_random_uuid(), 'Preschools', 'preschools', '💒', '#FDCB6E',
   (SELECT id FROM categories WHERE slug = 'education'), 5, true)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Step 2: Insert businesses using a DO block for clean variable handling
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_biz_id UUID;
BEGIN

  -- =========================================================================
  -- 1. Apollo Pharmacy
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Apollo Pharmacy', 'apollo-pharmacy',
    (SELECT id FROM categories WHERE slug = 'pharmacies'),
    'service',
    'Apollo 24|7 is the largest multi-channel digital healthcare platform in India, created with a vision of eliminating flexibility blockages from the healthcare industry. We believe in making healthcare affordable to everyone by combining analytic excellence, affordable cost, and extensive research with advanced technology.',
    '7942845937', NULL, 'https://www.apollo247.com/', NULL,
    'Ground Floor, Main Rd, Durganagar, Chandrampalem, Midhilapuri Vuda Colony, Madhurawada, Madhuravada, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0010, 17.7838 + 0.0020), 4326)::geography,
    'active', true, 3.0, 35, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/unnamed-1.jpg', 'seed/apollo-pharmacy/unnamed-1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/unnamed.jpg', 'seed/apollo-pharmacy/unnamed.jpg', false, 1, now());

  -- =========================================================================
  -- 2. M M Generics
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'M M Generics', 'mm-generics',
    (SELECT id FROM categories WHERE slug = 'pharmacies'),
    'service', NULL,
    '9177569150', NULL, NULL, '9177569150',
    '29/7 Shop No, 4-10, 2, Midhilapuri Vuda Colony, Madhuravada, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0015, 17.7838 + 0.0025), 4326)::geography,
    'active', true, 5.0, 3, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/M-M-Generics1.jpg', 'seed/mm-generics/M-M-Generics1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/M-M-Generics2.jpg', 'seed/mm-generics/M-M-Generics2.jpg', false, 1, now());

  -- =========================================================================
  -- 3. MedPlus
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'MedPlus', 'medplus',
    (SELECT id FROM categories WHERE slug = 'pharmacies'),
    'service',
    'With an aim to eradicate fake and ineffective medicines, and supply high-quality medicines in India, MedPlus was launched in 2006 in Hyderabad. Currently operating in 300+ cities, with 1500+ offline stores in India, MedPlus is the second largest pharmacy chain in India today.',
    '9346993750', NULL, 'https://www.medplusmart.com/', NULL,
    'Revenue Ward No.5, odd Bit, D.No 2-26/2 MIG-146, Plot No.146, Midhilapuri Vuda Colony, Madhurawada, Visakhapatnam, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0020, 17.7838 + 0.0015), 4326)::geography,
    'active', true, 4.2, 15, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/mediplus1.webp', 'seed/medplus/mediplus1.webp', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/mediplus2.webp', 'seed/medplus/mediplus2.webp', false, 1, now());

  -- =========================================================================
  -- 4. Sri Gayatri Vidya Nilayam
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Sri Gayatri Vidya Nilayam', 'sri-gayatri-vidya-nilayam',
    (SELECT id FROM categories WHERE slug = 'schools'),
    'service',
    'Sri Gayatri Vidya Nilayam is our motto to create a better society in Madhurawada, Visakhapatnam. Education is the only way to change the world through developing a way to think in a positive way.',
    '8886762229', NULL, 'https://www.sisyp.com/dir/vizag/edu/schools/sri-gayatri-vidya-nilayam-madhurawada/', '8886762229',
    'Near Ujwal Hospital, MSR Layout, Chandrampalem, Srinivasa Nagar, Madhurawada, Visakhapatnam, Andhra Pradesh, India - 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0010, 17.7838 + 0.0030), 4326)::geography,
    'active', true, 0, 0, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/gayatri1.jpg', 'seed/sri-gayatri-vidya-nilayam/gayatri1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/gayatri2.jpg', 'seed/sri-gayatri-vidya-nilayam/gayatri2.jpg', false, 1, now());

  -- =========================================================================
  -- 5. St. Francis School
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'St. Francis School', 'st-francis-school',
    (SELECT id FROM categories WHERE slug = 'schools'),
    'service',
    'St. Francis School, located in Madhurawada, Visakhapatnam, is a reputed educational institution dedicated to nurturing young minds with knowledge, discipline, and strong moral values.',
    '9346711372', 'sfstormadhurawada@yahoo.com', 'https://sfsmadhurawada.net/academics/', '9346711372',
    'Dharmapuri Colony, Midhilapuri Vuda Colony, Madhurawada, Madhuravada, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0015, 17.7838 + 0.0035), 4326)::geography,
    'active', true, 0, 0, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/sfc1.jpg', 'seed/st-francis-school/sfc1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/sfc2.jpg', 'seed/st-francis-school/sfc2.jpg', false, 1, now());

  -- =========================================================================
  -- 6. Greendale School
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Greendale School', 'greendale-school',
    (SELECT id FROM categories WHERE slug = 'schools'),
    'service',
    'Greendale School, established in 2015 by ALWARDAS GROUP, is a leading international school in Vizag, dedicated to academic excellence and holistic development.',
    '8978885500', 'greendalevizag@gmail.com', 'https://www.greendale-is.in/', NULL,
    'Opp. International Cricket Stadium, Vuda 100ft Road, Towards Shriram Properties, Madhurawada, Visakhapatnam – 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0020, 17.7838 + 0.0040), 4326)::geography,
    'active', true, 0, 0, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/green2.jpg', 'seed/greendale-school/green2.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/green1.jpg', 'seed/greendale-school/green1.jpg', false, 1, now());

  -- =========================================================================
  -- 7. The Intelli School Vizag
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'The Intelli School Vizag', 'the-intelli-school-vizag',
    (SELECT id FROM categories WHERE slug = 'schools'),
    'service',
    'Our school has been recognized among the best in the region, proudly ranked #2 in Visakhapatnam and #4 across Andhra Pradesh.',
    '9100666395', 'admissions@intellischool.in', 'https://www.intellischool.in/', NULL,
    'Intelli School Marikavalasa, Paradesipalem, Madhurawada, Visakhapatnam 530041.',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0025, 17.7838 + 0.0010), 4326)::geography,
    'active', true, 0, 0, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/inte1.jpg', 'seed/the-intelli-school-vizag/inte1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/inte2.jpg', 'seed/the-intelli-school-vizag/inte2.jpg', false, 1, now());

  -- =========================================================================
  -- 8. St.Ann's School (CBSE)
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'St. Anns School CBSE', 'st-anns-school-cbse',
    (SELECT id FROM categories WHERE slug = 'schools'),
    'service',
    'St. Ann''s School is an initiative of Catechist Sisters of St. Ann. Religious Congregation of Catechist Sisters of St. Ann''s School at Bakkannapalem, Madhurwada, Vizag has started functioning from last October (2010).',
    '9121789749', 'stannsbakkannapalem@gmail.com', 'https://stannscbse.com/', NULL,
    '11-3, Bakkannapalem, Pothinamallayya Palem, Visakhapatnam, Bakkanapalem, Andhra Pradesh 530048',
    'Visakhapatnam', 'Andhra Pradesh', '530048',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0030, 17.7838 + 0.0005), 4326)::geography,
    'active', true, 0, 0, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/sa1.jpg', 'seed/st-anns-school-cbse/sa1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/sa2.jpg', 'seed/st-anns-school-cbse/sa2.jpg', false, 1, now());

  -- =========================================================================
  -- 9. The Globe School
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'The Globe School', 'the-globe-school',
    (SELECT id FROM categories WHERE slug = 'schools'),
    'service',
    'A world class school with global standards is established in Visakhapatnam in 2019 for the parents who would like to join their children in a best school where their child learn subjects with innovative methods.',
    '9154131012', NULL, 'https://www.theglobeschool.in/', NULL,
    'near Sri Vijaya Durga Mallikarjuna Temple, Ayodhyanagar, Port Colony, Madhurawada, Madhuravada, Andhra Pradesh 530048',
    'Visakhapatnam', 'Andhra Pradesh', '530048',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0035, 17.7838 - 0.0005), 4326)::geography,
    'active', true, 0, 0, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/glob1.webp', 'seed/the-globe-school/glob1.webp', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/glob2.webp', 'seed/the-globe-school/glob2.webp', false, 1, now());

  -- =========================================================================
  -- 10. Narayana CO-School (Day Campus)
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Narayana CO-School Day Campus', 'narayana-co-school-day-campus',
    (SELECT id FROM categories WHERE slug = 'schools'),
    'service',
    'Situated in the flourishing locality of Kommadi, our school blends traditional values with modern educational practices to provide an enriching learning experience.',
    '9441871001', 'apvspkmcos2365@narayanagroup.com', 'https://www.narayanaschools.in/andhra-pradesh/vishakapatnam-kommadi/', NULL,
    'NARAYANA CO-SCHOOL & CO-COLLEGE, DAY SCHOLAR AC CAMPUS, KOMMADI, behind TRI SHAKTI AMMAVARI TEMPLE, Kala Nagar, Gandhi Nagar, Madhurawada, Madhuravada, Andhra Pradesh 530048',
    'Visakhapatnam', 'Andhra Pradesh', '530048',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0040, 17.7838 - 0.0010), 4326)::geography,
    'active', true, 0, 0, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/nar1.jpg', 'seed/narayana-co-school-day-campus/nar1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/nar2.jpg', 'seed/narayana-co-school-day-campus/nar2.jpg', false, 1, now());


  -- =========================================================================
  -- 11. Celebrations Restaurant
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Celebrations Restaurant', 'celebrations-restaurant',
    (SELECT id FROM categories WHERE slug = 'restaurants'),
    'physical', NULL,
    '9581340475', NULL, NULL, NULL,
    'R927+XJQ, 418, Midhilapuri Vuda Colony, Madhurawada, Madhuravada, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0025, 17.7838 - 0.0015), 4326)::geography,
    'active', true, 4.8, 5592, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/cel1.jpg', 'seed/celebrations-restaurant/cel1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/cel2.jpg', 'seed/celebrations-restaurant/cel2.jpg', false, 1, now());

  -- =========================================================================
  -- 12. Barbeque Nation
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Barbeque Nation', 'barbeque-nation',
    (SELECT id FROM categories WHERE slug = 'restaurants'),
    'physical',
    'Experience the vibrant atmosphere of our restaurants. Immerse yourself in the aroma of grilled delicacies.',
    '8069028744', NULL, 'http://www.barbequenation.com/', '919071788854',
    '3rd Floor, Arena Building, 100 Feet Rd, adjacent to Mango Hero Showroom, Midhilapuri Vuda Colony, Madhurawada, Madhuravada, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0030, 17.7838 - 0.0020), 4326)::geography,
    'active', true, 4.2, 1276, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/babi2.jpg', 'seed/barbeque-nation/babi2.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/bab1.avif', 'seed/barbeque-nation/bab1.avif', false, 1, now());

  -- =========================================================================
  -- 13. McDonald's
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'McDonalds', 'mcdonalds',
    (SELECT id FROM categories WHERE slug = 'restaurants'),
    'physical',
    'Waiting to sink your teeth into just about anything from the McDonalds food menu? We are without a doubt one of the most popular fast-food restaurants in the country, satiating people''s hunger and cravings and bringing a smile on their faces.',
    '8828116657', NULL, 'https://mcdelivery.co.in/', NULL,
    'Door No, Sy No.262, HIG-281, Vuda layout, Madhurawada, Visakhapatnam, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0035, 17.7838 - 0.0025), 4326)::geography,
    'active', true, 4.8, 704, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/md2.jpg', 'seed/mcdonalds/md2.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/md1.jpg', 'seed/mcdonalds/md1.jpg', false, 1, now());

  -- =========================================================================
  -- 14. Varun's Eat Restaurant
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Varuns Eat Restaurant', 'varuns-eat-restaurant',
    (SELECT id FROM categories WHERE slug = 'restaurants'),
    'physical', NULL,
    '8142154888', NULL, NULL, NULL,
    'it park hill no 2, Madhurawada, Madhuravada, Andhra Pradesh 530045',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0040, 17.7838 - 0.0030), 4326)::geography,
    'active', true, 4.4, 947, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/varun2.jpg', 'seed/varuns-eat-restaurant/varun2.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/varun1.jpg', 'seed/varuns-eat-restaurant/varun1.jpg', false, 1, now());

  -- =========================================================================
  -- 15. EatSure Food Court
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'EatSure Food Court', 'eatsure-food-court',
    (SELECT id FROM categories WHERE slug = 'restaurants'),
    'physical', NULL,
    '7075129666', NULL, 'https://www.eatsure.com/', NULL,
    'Ground Floor, DVR Grand, PM Palem, opposite Vijetha Supermarket, Anand Nagar, Madhurawada, Potinamallayyapalem, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0045, 17.7838 - 0.0035), 4326)::geography,
    'active', true, 4.8, 384, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/eat2.jpg', 'seed/eatsure-food-court/eat2.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/eat1.jpg', 'seed/eatsure-food-court/eat1.jpg', false, 1, now());

  -- =========================================================================
  -- 16. Eaters Stop (SKIPPING Bot 9 AI Themed Restaurant - has file:/// URLs)
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Eaters Stop', 'eaters-stop',
    (SELECT id FROM categories WHERE slug = 'restaurants'),
    'physical', NULL,
    '8466866688', NULL, 'https://www.eatersstop.com/', NULL,
    'STBL Theatres, Besides, near, Kommadi Junction, Srinivasa Nagar, Madhurawada, Madhuravada, Andhra Pradesh 530048',
    'Visakhapatnam', 'Andhra Pradesh', '530048',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0050, 17.7838 - 0.0040), 4326)::geography,
    'active', true, 4.6, 3114, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/stop1.jpg', 'seed/eaters-stop/stop1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/stop2.jpg', 'seed/eaters-stop/stop2.jpg', false, 1, now());

  -- =========================================================================
  -- 17. Aroma Multi Cuisine Restaurant
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Aroma Multi Cuisine Restaurant', 'aroma-multi-cuisine-restaurant',
    (SELECT id FROM categories WHERE slug = 'restaurants'),
    'physical', NULL,
    '6305655158', 'aromavizag@gmail.com', 'https://www.aromavizag.com/', NULL,
    'Chandu Central, Second Floor, Beside Duragalamma Temple, Srinivasa Nagar, Madhurawada, Madhuravada, Andhra Pradesh 530048',
    'Visakhapatnam', 'Andhra Pradesh', '530048',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0045, 17.7838 - 0.0015), 4326)::geography,
    'active', true, 3.9, 1242, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/aroma1.jpg', 'seed/aroma-multi-cuisine-restaurant/aroma1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/aroma2.jpg', 'seed/aroma-multi-cuisine-restaurant/aroma2.jpg', false, 1, now());

  -- =========================================================================
  -- 18. Temple Spa
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Temple Spa', 'temple-spa',
    (SELECT id FROM categories WHERE slug = 'salons'),
    'physical', NULL,
    '7396896222', NULL, NULL, NULL,
    'Plot no .16, Opp. Drunken Monkey, Midhilapuri Vuda Colony, Madhurawada, Madhuravada, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0005, 17.7838 + 0.0045), 4326)::geography,
    'active', true, 4.8, 456, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/templespa1.jpg', 'seed/temple-spa/templespa1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/templespa2.jpg', 'seed/temple-spa/templespa2.jpg', false, 1, now());

  -- =========================================================================
  -- 19. V&V Family Salon & Spa
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'V&V Family Salon & Spa', 'vv-family-salon-spa',
    (SELECT id FROM categories WHERE slug = 'salons'),
    'physical',
    'VNV Salons is a premium hair and beauty salon in Madhurawada Vizag, offering expert services in hair styling, skin care, and bridal makeup.',
    '9011186999', 'vandvsalonmadhurwada@gmail.com', 'https://vnvsalons.com/', NULL,
    'Door No- 2, 2nd Floor, Mithilapuri Colony, Midhilapuri Vuda Colony Madhurawada, Pothinamallayya Palem, Visakhapatnam, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0008, 17.7838 + 0.0050), 4326)::geography,
    'active', true, 4.9, 193, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/vnv1.jpg', 'seed/vv-family-salon-spa/vnv1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/vnv2.jpg', 'seed/vv-family-salon-spa/vnv2.jpg', false, 1, now());

  -- =========================================================================
  -- 20. Naturals Salon
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Naturals Salon', 'naturals-salon',
    (SELECT id FROM categories WHERE slug = 'salons'),
    'physical',
    'Naturals Salon, the best salon in Madhurawada with an outstanding 4.8 out of 5 average Google rating is part of the world fastest-growing salon chain with 850 plus locations across India and 25 years of expertise in beauty and wellness.',
    '9381893913', NULL, 'https://salons.naturals.in/', '9381893913',
    'Ground Floor, Chandu Central, beside Durga Amma Temple, Srinivasa Nagar, Madhurawada, Visakhapatnam, Madhuravada, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0012, 17.7838 - 0.0045), 4326)::geography,
    'active', true, 4.7, 1338, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/natural1.jpg', 'seed/naturals-salon/natural1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/natural2.jpg', 'seed/naturals-salon/natural2.jpg', false, 1, now());

  -- =========================================================================
  -- 21. Lakme Salon
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Lakme Salon', 'lakme-salon',
    (SELECT id FROM categories WHERE slug = 'salons'),
    'physical',
    'Lakme Salon offers a diverse range of services tailored for every beauty need, from bridal hair and makeup to hair transformations and skin care treatments.',
    '7416997275', NULL, 'https://salons.lakmesalon.in/', NULL,
    '1st Floor, Sri Sai Soudha, Plot No HIG 737, 100 Feet Rd, Midhilapuri Vuda Colony, Pothinamallayya Palem, Madhuravada, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0018, 17.7838 - 0.0050), 4326)::geography,
    'active', true, 4.8, 432, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/lakme1.jpg', 'seed/lakme-salon/lakme1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/lakme2.jpg', 'seed/lakme-salon/lakme2.jpg', false, 1, now());

  -- =========================================================================
  -- 22. Celebrity Cuts
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Celebrity Cuts', 'celebrity-cuts',
    (SELECT id FROM categories WHERE slug = 'salons'),
    'physical',
    'Experience expert hair, skin, and beauty services at Celebrity Cuts – where style meets professionalism.',
    '7730858858', 'info@celebritycuts.com', 'https://celebritycuts.in/', '7730858858',
    '2nd floor, plot no.Hig-1262, beside Bank of Boroda, opp. Ramya Parasise Function Hall, Midhilapuri Vuda Colony, Pothinamallayya Palem, Madhuravada, Visakhapatnam, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0022, 17.7838 + 0.0008), 4326)::geography,
    'active', true, 4.8, 5001, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/celb1.jpg', 'seed/celebrity-cuts/celb1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/celb2.jpg', 'seed/celebrity-cuts/celb2.jpg', false, 1, now());


  -- =========================================================================
  -- 23. SBI ATM (no photos in CSV)
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'SBI ATM', 'sbi-atm-madhurawada',
    (SELECT id FROM categories WHERE slug = 'atm'),
    'service', NULL,
    '18001234', NULL, 'https://bank.sbi/', NULL,
    'Hill No.1, Itsez Madhurawada C/O Kanakadurga Health Services Plot, Plot No.1, Visakhapatnam, Andhra Pradesh 530045',
    'Visakhapatnam', 'Andhra Pradesh', '530045',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0008, 17.7838 + 0.0012), 4326)::geography,
    'active', true, 0, 0, 0, now(), now()
  );

  -- =========================================================================
  -- 24. Axis Bank ATM
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Axis Bank ATM', 'axis-bank-atm-madhurawada',
    (SELECT id FROM categories WHERE slug = 'atm'),
    'service', NULL,
    '18605005555', NULL, 'https://branch.axisbank.com/', NULL,
    'Upper Ground Floor S.No: 16, Sai Tirumal Estates, 4E, PM Palem Main Rd, Anand Nagar, Madhurawada, Potinamallayyapalem, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0012, 17.7838 + 0.0018), 4326)::geography,
    'active', true, 0, 0, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/axatm2.jpg', 'seed/axis-bank-atm/axatm2.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/axatm1.jpg', 'seed/axis-bank-atm/axatm1.jpg', false, 1, now());

  -- =========================================================================
  -- 25. HDFC Bank ATM
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'HDFC Bank ATM', 'hdfc-bank-atm-madhurawada',
    (SELECT id FROM categories WHERE slug = 'atm'),
    'service', NULL,
    '18001601', NULL, 'https://www.hdfcbank.com/', NULL,
    'Ground Floor, Sai Enclave, D No 5/30/31, Yendada, Madhurawada, Pothinamallayya Palem, Endada, Andhra Pradesh 530045',
    'Visakhapatnam', 'Andhra Pradesh', '530045',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0018, 17.7838 + 0.0022), 4326)::geography,
    'active', true, 3.2, 2, 0, now(), now()
  );

  -- =========================================================================
  -- 26. ICICI ATM
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'ICICI ATM', 'icici-atm-madhurawada',
    (SELECT id FROM categories WHERE slug = 'atm'),
    'service', NULL,
    '7306667777', NULL, 'http://www.icicibank.com/', NULL,
    'HIG 02 377 / 02 Madhurawada, Midhilapuri Vuda Colony, Mithilapuri, Madhuravada, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0022, 17.7838 + 0.0028), 4326)::geography,
    'active', true, 2.9, 54, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/icicatm2.jpg', 'seed/icici-atm/icicatm2.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/icicatm1.jpg', 'seed/icici-atm/icicatm1.jpg', false, 1, now());

  -- =========================================================================
  -- 27. FirstCry Intellitots Preschool & Daycare
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'FirstCry Intellitots Preschool & Daycare', 'firstcry-intellitots-preschool-daycare',
    (SELECT id FROM categories WHERE slug = 'preschools'),
    'service',
    'With spacious outdoor play areas, state-of-art infrastructure, safe & secure environment and trained teachers, Firstcry Intellitots Preschool offers a memorable early learning experience for your precious little one.',
    '9347893477', NULL, 'https://www.firstcry.com/intelli/intellitots/preschool-near-you/visakhapatnam/madhurawada/', '9347893477',
    'No. 3-62/9, Door, Midhilapuri Vuda Colony, Madhurawada, Madhuravada, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0028, 17.7838 + 0.0032), 4326)::geography,
    'active', true, 4.8, 42, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/fristcry1.jpg', 'seed/firstcry-intellitots/fristcry1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/fristcry2.jpg', 'seed/firstcry-intellitots/fristcry2.jpg', false, 1, now());

  -- =========================================================================
  -- 28. Sanskriti Global Pre School
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Sanskriti Global Pre School', 'sanskriti-global-pre-school',
    (SELECT id FROM categories WHERE slug = 'preschools'),
    'service',
    'Sanskriti school''s distinct tradition, culture of innovation and indomitable school spirit, provides a fertile learning field for the New Age Child.',
    '8333858687', NULL, NULL, NULL,
    '126, H No, HIG, 3-73/1, Double Road, beside Karur Vysya Bank, Midhilapuri Vuda Colony, Madhuravada, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0032, 17.7838 + 0.0038), 4326)::geography,
    'active', true, 4.8, 12, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/san2.jpg', 'seed/sanskriti-global/san2.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/san1.jpg', 'seed/sanskriti-global/san1.jpg', false, 1, now());

  -- =========================================================================
  -- 29. Bachpan a Play School
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Bachpan a Play School', 'bachpan-a-play-school',
    (SELECT id FROM categories WHERE slug = 'preschools'),
    'service',
    'What are you looking for your child while preschool admissions are ON? With a network of 1200+ play schools operating in 400+ cities, Bachpan is ranked amongst one of the top preschool chains in India.',
    '9053633456', 'madhurwada1807@bachpanglobal.com', 'https://madhurwada.bachpanglobal.in/', NULL,
    '3-49, Midhilapuri Vuda Colony, Madhurawada, Madhuravada, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0036, 17.7838 + 0.0042), 4326)::geography,
    'active', true, 3.8, 19, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/san2.jpg', 'seed/bachpan-play-school/san2.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/san1.jpg', 'seed/bachpan-play-school/san1.jpg', false, 1, now());

  -- =========================================================================
  -- 30. Cambridge Montessori Pre School
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Cambridge Montessori Pre School', 'cambridge-montessori-pre-school',
    (SELECT id FROM categories WHERE slug = 'preschools'),
    'service', NULL,
    '8555015234', NULL, 'http://cmpsmadurwada.com/', NULL,
    '100 Feet Rd, Revenue Layout, Midhilapuri Vuda Colony, Madhurawada, Madhuravada, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0040, 17.7838 + 0.0046), 4326)::geography,
    'active', true, 4.1, 61, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/mon1.jpg', 'seed/cambridge-montessori/mon1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/mon2.jpg', 'seed/cambridge-montessori/mon2.jpg', false, 1, now());

  -- =========================================================================
  -- 31. Kidzee Preschool and Daycare
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Kidzee Preschool and Daycare', 'kidzee-preschool-and-daycare',
    (SELECT id FROM categories WHERE slug = 'preschools'),
    'service',
    'At Kidzee Midhilapuri Colony, every child is celebrated as a unique little star. Our play-based, activity-rich curriculum blends creativity, music, storytelling and structured learning.',
    '9032949333', 'kidzee6424@kidzee.com', 'https://www.kidzeemidhilapuricolony.com/', NULL,
    '2-159/6, HIG 656, Mithilapuri Colony, Midhilapuri Vuda Colony, Madhurawada, Madhuravada, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0044, 17.7838 + 0.0048), 4326)::geography,
    'active', true, 4.9, 30, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/kidz1.jpg', 'seed/kidzee-preschool/kidz1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/kidz2.jpg', 'seed/kidzee-preschool/kidz2.jpg', false, 1, now());

  -- =========================================================================
  -- 32. EuroKids PreSchool
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'EuroKids PreSchool', 'eurokids-preschool',
    (SELECT id FROM categories WHERE slug = 'preschools'),
    'service',
    'EuroKids is part of Lighthouse Learning Group, India''s leading Early Childhood & K-12 Education group backed by KKR Capital.',
    '9513181281', 'eurokidsmadhurawada@gmail.com', 'https://www.eurokidsindia.com/preschool-in-visakhapatnam/madhurawada/', NULL,
    '2-116/1A, Plot No 19, Revenue Layout, Midhilapuri Vuda Colony, Madhurawada, Madhuravada, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0048, 17.7838 + 0.0010), 4326)::geography,
    'active', true, 4.9, 84, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/euro1.jpg', 'seed/eurokids-preschool/euro1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/euro2.jpg', 'seed/eurokids-preschool/euro2.jpg', false, 1, now());


  -- =========================================================================
  -- 33. HIT THE FLOOR DANCE STUDIO
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'HIT THE FLOOR DANCE STUDIO', 'hit-the-floor-dance-studio',
    (SELECT id FROM categories WHERE slug = 'entertainment'),
    'service', NULL,
    '8184847370', NULL, NULL, NULL,
    'Main Rd, Durganagar, Chandrampalem, Midhilapuri Vuda Colony, Pothinamallayya Palem, Madhuravada, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0028, 17.7838 - 0.0018), 4326)::geography,
    'active', true, 5.0, 28, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/hit2.jpg', 'seed/hit-the-floor-dance/hit2.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/hit1.jpg', 'seed/hit-the-floor-dance/hit1.jpg', false, 1, now());

  -- =========================================================================
  -- 34. RJ STUDIO
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'RJ STUDIO', 'rj-studio',
    (SELECT id FROM categories WHERE slug = 'entertainment'),
    'service', NULL,
    '7981731226', NULL, NULL, NULL,
    'Gayatri Nagar, Road no.4, Samith Towers, Ground Floor 1&2, Pothinamallayya Palem Rd, opposite Vijetha Super Market, Pothinamallayya Palem, Bakkanapalem, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0032, 17.7838 - 0.0022), 4326)::geography,
    'active', true, 4.9, 167, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/rj2.jpg', 'seed/rj-studio/rj2.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/rj1.jpg', 'seed/rj-studio/rj1.jpg', false, 1, now());

  -- =========================================================================
  -- 35. MK Dance Studio
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'MK Dance Studio', 'mk-dance-studio',
    (SELECT id FROM categories WHERE slug = 'entertainment'),
    'service', NULL,
    '9515732358', NULL, NULL, NULL,
    'Aranjyothi Nilayam, 6-137, Ujwal Hospitals Road, beside New Park, Srinivasa Nagar, Madhurawada, Madhuravada, Andhra Pradesh 530048',
    'Visakhapatnam', 'Andhra Pradesh', '530048',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0036, 17.7838 - 0.0028), 4326)::geography,
    'active', true, 5.0, 2, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/mk2.jpg', 'seed/mk-dance-studio/mk2.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/mk1.jpg', 'seed/mk-dance-studio/mk1.jpg', false, 1, now());

  -- =========================================================================
  -- 36. Madhurawada Bus Stop
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Madhurawada Bus Stop', 'madhurawada-bus-stop',
    (SELECT id FROM categories WHERE slug = 'travel'),
    'public', NULL,
    NULL, NULL, NULL, NULL,
    'Opposite ZPH School, Srinivasa Nagar, Madhurawada, Madhuravada, Andhra Pradesh 530048',
    'Visakhapatnam', 'Andhra Pradesh', '530048',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0038, 17.7838 - 0.0032), 4326)::geography,
    'active', true, 3.2, 31, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/bus1.jpg', 'seed/madhurawada-bus-stop/bus1.jpg', true, 0, now());

  -- =========================================================================
  -- 37. Kommadi Junction Bus Stop
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Kommadi Junction Bus Stop', 'kommadi-junction-bus-stop',
    (SELECT id FROM categories WHERE slug = 'travel'),
    'public', NULL,
    NULL, NULL, NULL, NULL,
    'R9F4+HJX, Kommadi Junction, Srinivasa Nagar, Madhurawada, Madhuravada, Andhra Pradesh 530048',
    'Visakhapatnam', 'Andhra Pradesh', '530048',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0042, 17.7838 - 0.0036), 4326)::geography,
    'active', true, 4.0, 1204, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/bus2.jpg', 'seed/kommadi-junction-bus-stop/bus2.jpg', true, 0, now());

  -- =========================================================================
  -- 38. Madurawada Car Shed Bus Stop
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Madurawada Car Shed Bus Stop', 'madurawada-car-shed-bus-stop',
    (SELECT id FROM categories WHERE slug = 'travel'),
    'public', NULL,
    NULL, NULL, NULL, NULL,
    'R933+F7V, Anand Nagar, Madhurawada, Mithililapuri, Visakhapatnam, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0046, 17.7838 - 0.0038), 4326)::geography,
    'active', true, 4.1, 34, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/bus3.jpg', 'seed/madurawada-car-shed-bus-stop/bus3.jpg', true, 0, now());

  -- =========================================================================
  -- 39. PM Palem 1st Bus Stop (no photo)
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'PM Palem 1st Bus Stop', 'pm-palem-1st-bus-stop',
    (SELECT id FROM categories WHERE slug = 'travel'),
    'public', NULL,
    NULL, NULL, NULL, NULL,
    'Anand Nagar, Pothinamallayya Palem, Potinamallayyapalem, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0048, 17.7838 - 0.0040), 4326)::geography,
    'active', true, 4.1, 48, 0, now(), now()
  );

  -- =========================================================================
  -- 40. Last Bus Stop Circle - P. M Palem
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Last Bus Stop Circle PM Palem', 'last-bus-stop-circle-pm-palem',
    (SELECT id FROM categories WHERE slug = 'travel'),
    'public', NULL,
    NULL, NULL, NULL, NULL,
    'R84Q+PJ5, SBI Colony, Pothinamallayya Palem, Potinamallayyapalem, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0050, 17.7838 - 0.0042), 4326)::geography,
    'active', true, 4.3, 56, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/bus4.jpg', 'seed/last-bus-stop-pm-palem/bus4.jpg', true, 0, now());


  -- =========================================================================
  -- 41. Sivalayam (Temple)
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Sivalayam', 'sivalayam-madhurawada',
    (SELECT id FROM categories WHERE slug = 'devotional'),
    'public', NULL,
    NULL, NULL, NULL, NULL,
    '1, Vizag - Srikakulam Hwy, Anand Nagar, Pothinamallayya Palem, Potinamallayyapalem, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0002, 17.7838 - 0.0008), 4326)::geography,
    'active', true, 4.6, 33, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/t1.jpg', 'seed/sivalayam/t1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/t2.jpg', 'seed/sivalayam/t2.jpg', false, 1, now());

  -- =========================================================================
  -- 42. Sri Rajarajeshwari Alayam
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Sri Rajarajeshwari Alayam', 'sri-rajarajeshwari-alayam',
    (SELECT id FROM categories WHERE slug = 'devotional'),
    'public', NULL,
    NULL, NULL, NULL, NULL,
    'R956+2JF, Chandrampalem, Srinivasa Nagar, Madhurawada, Madhuravada, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0006, 17.7838 - 0.0012), 4326)::geography,
    'active', true, 4.8, 27, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/t3.jpg', 'seed/sri-rajarajeshwari/t3.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/t4.jpg', 'seed/sri-rajarajeshwari/t4.jpg', false, 1, now());

  -- =========================================================================
  -- 43. Sri Venkateshwara Swamy Temple
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Sri Venkateshwara Swamy Temple', 'sri-venkateshwara-swamy-temple',
    (SELECT id FROM categories WHERE slug = 'devotional'),
    'public', NULL,
    NULL, NULL, NULL, NULL,
    'Srinivasnagar, Nagarampalem, Main Rd, Madhurawada, Madhuravada, Andhra Pradesh 530048',
    'Visakhapatnam', 'Andhra Pradesh', '530048',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0014, 17.7838 - 0.0016), 4326)::geography,
    'active', true, 4.6, 255, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/t5.jpg', 'seed/sri-venkateshwara/t5.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/t6.jpg', 'seed/sri-venkateshwara/t6.jpg', false, 1, now());

  -- =========================================================================
  -- 44. TRI SHAKTI AMMAVARI AALAYAM
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'TRI SHAKTI AMMAVARI AALAYAM', 'tri-shakti-ammavari-aalayam',
    (SELECT id FROM categories WHERE slug = 'devotional'),
    'public', NULL,
    NULL, NULL, NULL, NULL,
    '9-25/2, NH16, Krishnanagar, Gandhi Nagar, Madhurawada, Madhuravada, Andhra Pradesh 530048',
    'Visakhapatnam', 'Andhra Pradesh', '530048',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0019, 17.7838 - 0.0020), 4326)::geography,
    'active', true, 4.4, 255, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/t1.jpg', 'seed/tri-shakti-ammavari/t1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/t2.jpg', 'seed/tri-shakti-ammavari/t2.jpg', false, 1, now());

  -- =========================================================================
  -- 45. Sri Bhuneela Sametha Vaibhava Venkateswara Swamy Temple
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Sri Bhuneela Sametha Vaibhava Venkateswara Swamy Temple', 'sri-bhuneela-sametha-vaibhava-venkateswara-swamy-temple',
    (SELECT id FROM categories WHERE slug = 'devotional'),
    'public', NULL,
    NULL, NULL, NULL, NULL,
    'Q9XC+XXF, Madhuravada, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0024, 17.7838 - 0.0024), 4326)::geography,
    'active', true, 4.8, 208, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/t7.jpg', 'seed/sri-bhuneela/t7.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/t8.jpg', 'seed/sri-bhuneela/t8.jpg', false, 1, now());

  -- =========================================================================
  -- 46. Trinity Lutheran Church
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Trinity Lutheran Church', 'trinity-lutheran-church',
    (SELECT id FROM categories WHERE slug = 'devotional'),
    'public', NULL,
    NULL, NULL, NULL, NULL,
    'Midhilapuri Vuda Colony, Pothinamallayya Palem, Madhuravada, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0030, 17.7838 - 0.0028), 4326)::geography,
    'active', true, 4.5, 74, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/c1.jpg', 'seed/trinity-lutheran-church/c1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/c2.jpg', 'seed/trinity-lutheran-church/c2.jpg', false, 1, now());

  -- =========================================================================
  -- 47. St. Francis of Assisi Church
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'St. Francis of Assisi Church', 'st-francis-of-assisi-church',
    (SELECT id FROM categories WHERE slug = 'devotional'),
    'public', NULL,
    NULL, NULL, NULL, NULL,
    'HIG193, Main Road, Dharmapuri Colony, Midhilapuri Vuda Colony, Madhurawada, Madhuravada, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0034, 17.7838 - 0.0032), 4326)::geography,
    'active', true, 4.5, 136, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/c3.jpg', 'seed/st-francis-assisi-church/c3.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/c4.jpg', 'seed/st-francis-assisi-church/c4.jpg', false, 1, now());

  -- =========================================================================
  -- 48. Grace Harvest Church
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Grace Harvest Church', 'grace-harvest-church',
    (SELECT id FROM categories WHERE slug = 'devotional'),
    'public', NULL,
    NULL, NULL, NULL, NULL,
    '26-5/1A, Mallayyapalem, near RTC Colony, RTC Colony, Srinivasa Nagar, Madhurawada, Madhuravada, Andhra Pradesh 530048',
    'Visakhapatnam', 'Andhra Pradesh', '530048',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0038, 17.7838 - 0.0036), 4326)::geography,
    'active', true, 4.8, 39, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/c5.jpg', 'seed/grace-harvest-church/c5.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/c6.jpg', 'seed/grace-harvest-church/c6.jpg', false, 1, now());

  -- =========================================================================
  -- 49. MASJID-E-MUZAMMIL
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'MASJID-E-MUZAMMIL', 'masjid-e-muzammil',
    (SELECT id FROM categories WHERE slug = 'devotional'),
    'public', NULL,
    NULL, NULL, NULL, NULL,
    '11-93/2, NH16, Srinivasa Nagar, Madhurawada, Madhuravada, Andhra Pradesh 530048',
    'Visakhapatnam', 'Andhra Pradesh', '530048',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0042, 17.7838 - 0.0038), 4326)::geography,
    'active', true, 4.5, 66, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/m1.jpg', 'seed/masjid-e-muzammil/m1.jpg', true, 0, now());

  -- =========================================================================
  -- 50. Masjid-E-Firdous
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Masjid-E-Firdous Ahle Sunnath Wal Jamaath', 'masjid-e-firdous',
    (SELECT id FROM categories WHERE slug = 'devotional'),
    'public', NULL,
    NULL, NULL, NULL, NULL,
    'R9F7+5WM sri sadhguru, sainath colony, Madhurawada, Madhuravada, Andhra Pradesh 530048',
    'Visakhapatnam', 'Andhra Pradesh', '530048',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0046, 17.7838 - 0.0040), 4326)::geography,
    'active', true, 4.4, 22, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/m2.jpg', 'seed/masjid-e-firdous/m2.jpg', true, 0, now());

  -- =========================================================================
  -- 51. Osmania Masjid
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Osmania Masjid', 'osmania-masjid-madhurawada',
    (SELECT id FROM categories WHERE slug = 'devotional'),
    'public', NULL,
    NULL, NULL, NULL, NULL,
    'R82R+JVM, Muslim Colony, Pothinamallayya Palem, Potinamallayyapalem, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0050, 17.7838 - 0.0042), 4326)::geography,
    'active', true, 4.5, 97, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/m3.jpg', 'seed/osmania-masjid/m3.jpg', true, 0, now());


  -- =========================================================================
  -- 52. Kala Car Decors
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Kala Car Decors', 'kala-car-decors',
    (SELECT id FROM categories WHERE slug = 'services'),
    'service', NULL,
    '7661075713', NULL, NULL, NULL,
    '10-14/2, kommadi junction, Srinivasa Nagar, Madhurawada, Madhuravada, Andhra Pradesh 530048',
    'Visakhapatnam', 'Andhra Pradesh', '530048',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0005, 17.7838 + 0.0002), 4326)::geography,
    'active', true, 4.5, 12, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/kala1.jpg', 'seed/kala-car-decors/kala1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/kala2.jpg', 'seed/kala-car-decors/kala2.jpg', false, 1, now());

  -- =========================================================================
  -- 53. A to Z Car Decor
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'A to Z Car Decor', 'a-to-z-car-decor',
    (SELECT id FROM categories WHERE slug = 'services'),
    'service', NULL,
    '9704412123', NULL, NULL, NULL,
    'Sivasakthi Nagar Rd, Srinivasa Nagar, Madhurawada, Madhuravada, Andhra Pradesh 530048',
    'Visakhapatnam', 'Andhra Pradesh', '530048',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0009, 17.7838 + 0.0006), 4326)::geography,
    'active', true, 4.3, 50, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/atoz1.jpg', 'seed/a-to-z-car-decor/atoz1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/atoz2.jpg', 'seed/a-to-z-car-decor/atoz2.jpg', false, 1, now());

  -- =========================================================================
  -- 54. Sri NS CAR DECORS
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Sri NS Car Decors', 'sri-ns-car-decors',
    (SELECT id FROM categories WHERE slug = 'services'),
    'service', NULL,
    '9550007092', NULL, NULL, NULL,
    '100 Feet Rd, Midhilapuri Vuda Colony, Madhurawada, Visakhapatnam, Madhuravada, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0013, 17.7838 + 0.0009), 4326)::geography,
    'active', true, 4.9, 22, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/sri1.jpg', 'seed/sri-ns-car-decors/sri1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/sri2.jpg', 'seed/sri-ns-car-decors/sri2.jpg', false, 1, now());

  -- =========================================================================
  -- 55. DMart
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'DMart', 'dmart-madhurawada',
    (SELECT id FROM categories WHERE slug = 'grocery'),
    'physical',
    'DMart is a one-stop supermarket chain that aims to offer customers a wide range of basic home and personal products under one roof.',
    '912233400500', 'suggestion@dmartindia.com', 'https://www.dmartindia.com/', NULL,
    '8-7/3, near Flaywor, Srinivasa Nagar, Madhurawada, Madhuravada, Andhra Pradesh 530048',
    'Visakhapatnam', 'Andhra Pradesh', '530048',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0017, 17.7838 + 0.0014), 4326)::geography,
    'active', true, 4.2, 20108, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/dmart1.jpg', 'seed/dmart/dmart1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/dmart2.jpg', 'seed/dmart/dmart2.jpg', false, 1, now());

  -- =========================================================================
  -- 56. Vijetha Super Market
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Vijetha Super Market', 'vijetha-super-market',
    (SELECT id FROM categories WHERE slug = 'grocery'),
    'physical', NULL,
    '8912562124', NULL, NULL, NULL,
    'State Bank Of India Colony, Car Shed Rd, Anand Nagar, Madhurawada, Potinamallayyapalem, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530048',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0021, 17.7838 + 0.0019), 4326)::geography,
    'active', true, 3.9, 1323, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/vijya1.jpg', 'seed/vijetha-super-market/vijya1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/vijya2.jpg', 'seed/vijetha-super-market/vijya2.jpg', false, 1, now());

  -- =========================================================================
  -- 57. Khushi Shopping Mall
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Khushi Shopping Mall', 'khushi-shopping-mall',
    (SELECT id FROM categories WHERE slug = 'grocery'),
    'physical',
    'For over two decades, Khushi Shopping Mall has been the heartbeat of the local community. What started as a small family-run grocery store has transformed into the premier shopping destination for quality, freshness, and variety.',
    '9885139742', 'khushishoppingmall@gmail.com', 'https://www.khushishoppingmall.in/', NULL,
    'Khushi Shopping Mall, Midhilapuri Vuda Colony, Madhurawada, Visakhapatnam, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0025, 17.7838 + 0.0024), 4326)::geography,
    'active', true, 3.9, 1134, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/khishi1.jpg', 'seed/khushi-shopping-mall/khishi1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/khishi2.jpg', 'seed/khushi-shopping-mall/khishi2.jpg', false, 1, now());

  -- =========================================================================
  -- 58. Metro Cash & Carry
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Metro Cash & Carry', 'metro-cash-and-carry',
    (SELECT id FROM categories WHERE slug = 'grocery'),
    'physical',
    'METRO Cash & Carry, a unit of Reliance Retail Ventures Ltd., is India''s leading wholesale company, with food and non-food assortments, and specializes in serving the needs of Traders, Kiranas; Hotels, Restaurants, and Caterers (HoReCa).',
    '8142715478', 'metro.care@ril.com', 'https://www.metro.co.in/', NULL,
    'Survey No, 165/P, Marikavalasa Rd, Paradesipalem Village, Madhurawada, Pataparadesipalem, Andhra Pradesh 530048',
    'Visakhapatnam', 'Andhra Pradesh', '530048',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0029, 17.7838 + 0.0029), 4326)::geography,
    'active', true, 4.0, 1605, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/metro1.jpg', 'seed/metro-cash-carry/metro1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/metro2.jpg', 'seed/metro-cash-carry/metro2.jpg', false, 1, now());

  -- =========================================================================
  -- 59. Fresh Signature
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Fresh Signature', 'fresh-signature',
    (SELECT id FROM categories WHERE slug = 'grocery'),
    'physical', NULL,
    '18008910001', 'customerservice@ril.com', 'https://stores.freshpikonline.com/', NULL,
    'Ground Floor, No. 3-77, Main Rd, near ICICI Bank, Chandrampalem, Midhilapuri Vuda Colony, Pothinamallayya Palem, Madhuravada, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0033, 17.7838 + 0.0034), 4326)::geography,
    'active', true, 2.0, 19, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/fresh1.jpg', 'seed/fresh-signature/fresh1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/fresh2.jpg', 'seed/fresh-signature/fresh2.jpg', false, 1, now());


  -- =========================================================================
  -- 60. Bhargav's Box Cricket Vizag
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Bhargavs Box Cricket Vizag', 'bhargavs-box-cricket-vizag',
    (SELECT id FROM categories WHERE slug = 'sports'),
    'physical', NULL,
    NULL, NULL, NULL, NULL,
    'IT Junction, Srinivasa Nagar, Madhurawada, Madhuravada, Andhra Pradesh 530048',
    'Visakhapatnam', 'Andhra Pradesh', '530048',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0037, 17.7838 + 0.0039), 4326)::geography,
    'active', true, 4.6, 53, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/cric1.jpg', 'seed/bhargavs-box-cricket/cric1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/cric2.jpg', 'seed/bhargavs-box-cricket/cric2.jpg', false, 1, now());

  -- =========================================================================
  -- 61. Strokes Box Cricket
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Strokes Box Cricket', 'strokes-box-cricket',
    (SELECT id FROM categories WHERE slug = 'sports'),
    'physical',
    'Strokes Box Cricket offers a premium indoor turf designed for exciting box cricket matches. With well-maintained pitches, proper lighting, and spacious playing areas, it''s perfect for casual games, practice sessions, and competitive leagues.',
    '9505503041', NULL, 'https://playo.co/venues/madhurawada-visakhapatnam/strokes-box-cricket-madhurawada-visakhapatnam', NULL,
    'northstar homes office, 100 Feet Rd, beside cinepolis, behind Srikanya cinepolis, Madhurawada, Madhuravada, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0041, 17.7838 + 0.0043), 4326)::geography,
    'active', true, 4.5, 65, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/cric3.jpg', 'seed/strokes-box-cricket/cric3.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/cric4.jpg', 'seed/strokes-box-cricket/cric4.jpg', false, 1, now());

  -- =========================================================================
  -- 62. RR Box Cricket
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'RR Box Cricket', 'rr-box-cricket',
    (SELECT id FROM categories WHERE slug = 'sports'),
    'physical', NULL,
    NULL, NULL, NULL, NULL,
    '37-1A, Behind Narayana Techno School Carshed, Junction, Road, Pilakavanipalem, Madhurawada, Madhuravada, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0044, 17.7838 + 0.0047), 4326)::geography,
    'active', true, 4.9, 14, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/cric5.jpg', 'seed/rr-box-cricket/cric5.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/cric6.jpg', 'seed/rr-box-cricket/cric6.jpg', false, 1, now());

  -- =========================================================================
  -- 63. SK Sports Arena Box Cricket
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'SK Sports Arena Box Cricket', 'sk-sports-arena-box-cricket',
    (SELECT id FROM categories WHERE slug = 'sports'),
    'physical',
    'Step into fast-paced cricketing action at SK Box Cricket, where quick reflexes and big shots keep the game thrilling!',
    '6303477419', NULL, 'https://playo.co/venues/visakhapatnam/sk-box-cricket-madhurawada-visakhapatnam', NULL,
    'Kapuluppada Beach Road, Marikvalsaa, Madhurawada, Visakhapatnam, Andhra Pradesh – 530048',
    'Visakhapatnam', 'Andhra Pradesh', '530048',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0047, 17.7838 + 0.0050), 4326)::geography,
    'active', true, 4.8, 42, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/cric7.jpg', 'seed/sk-sports-arena/cric7.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/cric8.jpg', 'seed/sk-sports-arena/cric8.jpg', false, 1, now());

  -- =========================================================================
  -- 64. ARK SPORTS ARENA
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'ARK SPORTS ARENA', 'ark-sports-arena',
    (SELECT id FROM categories WHERE slug = 'sports'),
    'physical', NULL,
    '7981469402', NULL, NULL, NULL,
    '156, Krishna Nagar, Srinivasa Nagar, Madhurawada, Madhuravada, Andhra Pradesh 530048',
    'Visakhapatnam', 'Andhra Pradesh', '530048',
    ST_SetSRID(ST_MakePoint(83.3705 - 0.0050, 17.7838 + 0.0003), 4326)::geography,
    'active', true, 4.7, 44, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/cric9.jpg', 'seed/ark-sports-arena/cric9.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/cric10.jpg', 'seed/ark-sports-arena/cric10.jpg', false, 1, now());

  -- =========================================================================
  -- 65. Ariya Hospital
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Ariya Hospital', 'ariya-hospital',
    (SELECT id FROM categories WHERE slug = 'hospitals'),
    'service',
    'At Ariya Hospitals, we combine advanced medical technology with compassionate care to ensure your journey to health is smooth and comfortable.',
    '7075318180', 'ariyahospitalinfo@gmail.com', 'https://ariyahospitals.com/', NULL,
    'D.No. 4-20/6/1, near DTDC, Midhilapuri vuda colony, Madhurawada, Vsp-530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0003, 17.7838 + 0.0016), 4326)::geography,
    'active', true, 4.4, 470, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/ariya1.jpg', 'seed/ariya-hospital/ariya1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/ariya2.jpg', 'seed/ariya-hospital/ariya2.jpg', false, 1, now());

  -- =========================================================================
  -- 66. Shiva Shakthi Hospital
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Shiva Shakthi Hospital', 'shiva-shakthi-hospital',
    (SELECT id FROM categories WHERE slug = 'hospitals'),
    'service',
    'Welcome to Shiva Shakthi Hospital, a leading healthcare institution in Visakhapatnam, Andhra Pradesh. Our commitment to providing exceptional medical care stems from a foundation built on trust, compassion, and expertise.',
    '7702305605', 'info@shivashakthihospital.com', 'https://shivashakthihospital.com/', NULL,
    'MIG, 190 plot 13-10, MIG-190, Anand Nagar, Pothinamallayya Palem, Potinamallayyapalem, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0007, 17.7838 + 0.0021), 4326)::geography,
    'active', true, 4.8, 170, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/siva1.jpg', 'seed/shiva-shakthi-hospital/siva1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/siva2.jpg', 'seed/shiva-shakthi-hospital/siva2.jpg', false, 1, now());

  -- =========================================================================
  -- 67. Dr Bhargavi's Dental Speciality Centre
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Dr Bhargavis Dental Speciality Centre', 'dr-bhargavis-dental-speciality-centre',
    (SELECT id FROM categories WHERE slug = 'hospitals'),
    'service',
    'With over 15 years of experience in the dental field, I specialize in root canal treatments, dental implants, and a wide range of advanced dental procedures.',
    '7601037106', 'drbhargavisdentalspecialitycen@gmail.com', 'https://www.drbhargavisdentalspecialitycentre.com/', '7601037106',
    '2nd Floor, PNB Complex, NH 16 Service Rd, Car Shed Rd, Pothinamallayya Palem, Visakhapatnam, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0011, 17.7838 + 0.0026), 4326)::geography,
    'active', true, 5.0, 160, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/bhar1.jpg', 'seed/dr-bhargavis-dental/bhar1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/bhar2.jpg', 'seed/dr-bhargavis-dental/bhar2.jpg', false, 1, now());

  -- =========================================================================
  -- 68. Vedanta Women and Children Hospital
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Vedanta Women and Children Hospital', 'vedanta-women-and-children-hospital',
    (SELECT id FROM categories WHERE slug = 'hospitals'),
    'service',
    'Welcome to Vedanta Multispeciality Hospital, where your health and well-being are our top priority. Nestled in the heart of Madhurawada, we are a dedicated facility providing comprehensive healthcare services under one roof.',
    '8498083999', 'vedantahealthcare99@gmail.com', 'https://www.vedantahospitals.org/', NULL,
    'HIG 10-37, PM PALEM 80 FEET ROAD, BESIDES INDIAN BANK Madhurawada, Pothinamallayya Palem, Potinamallayyapalem, Andhra Pradesh 530041',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0016, 17.7838 + 0.0031), 4326)::geography,
    'active', true, 4.8, 1151, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/ved1.jpg', 'seed/vedanta-hospital/ved1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/ved2.jpg', 'seed/vedanta-hospital/ved2.jpg', false, 1, now());

  -- =========================================================================
  -- 69. Neo Vision Eye & Skin Speciality Hospital
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Neo Vision Eye & Skin Speciality Hospital', 'neo-vision-eye-skin-speciality-hospital',
    (SELECT id FROM categories WHERE slug = 'hospitals'),
    'service',
    'Our unique approach of exact diagnosis, treating the root cause of problems to prevent reoccurrence, educating the patient to solve their own skin problems more efficiently, and personalized care by knowledgeable, trained, and dedicated Eye & Skin Specialists.',
    '8977695689', 'info@neovisionandskin.com', 'https://neovisionandskin.com/', '9030605737',
    'DR BALAKRISHNAS NEO VISION SPECIALITY EYE HOSPITAL, Plot No: 776, Midhilapuri VUDA Colony, 100 Feet Road, Madhurawada, Visakhapatnam, Andhra Pradesh-530041.',
    'Visakhapatnam', 'Andhra Pradesh', '530041',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0021, 17.7838 + 0.0036), 4326)::geography,
    'active', true, 4.9, 551, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/neo1.jpg', 'seed/neo-vision-hospital/neo1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/neo2.jpg', 'seed/neo-vision-hospital/neo2.jpg', false, 1, now());

  -- =========================================================================
  -- 70. Madhurawada PHC
  -- =========================================================================
  INSERT INTO businesses (id, owner_id, name, slug, category_id, type, description, phone, email, website, whatsapp, address, city, state, pin, location, status, verified, rating_avg, review_count, view_count, created_at, updated_at)
  VALUES (
    gen_random_uuid(), NULL, 'Madhurawada PHC', 'madhurawada-phc',
    (SELECT id FROM categories WHERE slug = 'hospitals'),
    'service', NULL,
    NULL, NULL, NULL, NULL,
    'Dasari Complex, 15-3, Opposite ZPH School, 15-3, Main Rd, Opposite ZPH School, Srinivasa Nagar, Madhurawada, Madhuravada, Andhra Pradesh 530048',
    'Visakhapatnam', 'Andhra Pradesh', '530048',
    ST_SetSRID(ST_MakePoint(83.3705 + 0.0026, 17.7838 + 0.0041), 4326)::geography,
    'active', true, 3.9, 26, 0, now(), now()
  ) RETURNING id INTO v_biz_id;

  INSERT INTO business_photos (id, business_id, url, storage_path, is_primary, display_order, created_at) VALUES
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/phc1.jpg', 'seed/madhurawada-phc/phc1.jpg', true, 0, now()),
    (gen_random_uuid(), v_biz_id, 'https://getnear-assets.s3.ap-south-1.amazonaws.com/business-photos/phc2.jpg', 'seed/madhurawada-phc/phc2.jpg', false, 1, now());

END $$;

COMMIT;
