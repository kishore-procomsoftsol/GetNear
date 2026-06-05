-- Migration: 010_review_moderation.sql
-- Description: Adds review moderation support with status column, rating recalculation function, and composite index

-- Add status column to reviews table with CHECK constraint
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- Create composite index for efficient filtered queries by business and status
CREATE INDEX IF NOT EXISTS idx_reviews_business_status ON reviews(business_id, status);

-- Create function to recalculate business rating using only approved reviews
CREATE OR REPLACE FUNCTION recalculate_business_rating(p_business_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE businesses
  SET
    rating_avg = COALESCE(
      (SELECT AVG(rating)::numeric(3,2) FROM reviews
       WHERE business_id = p_business_id AND status = 'approved'),
      0
    ),
    review_count = (
      SELECT COUNT(*) FROM reviews
      WHERE business_id = p_business_id AND status = 'approved'
    ),
    updated_at = NOW()
  WHERE id = p_business_id;
END;
$$ LANGUAGE plpgsql;
