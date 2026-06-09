-- Migration: 011_fix_rating_trigger_status_filter.sql
-- Description: Updates the update_business_rating() trigger function to only
-- count approved reviews when recalculating rating_avg and review_count.
-- This aligns the trigger with the recalculate_business_rating() function
-- introduced in migration 010 and ensures homepage listing cards show
-- accurate ratings.

CREATE OR REPLACE FUNCTION update_business_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_business_id UUID;
BEGIN
  -- Determine which business to update based on the DML operation.
  IF TG_OP = 'DELETE' THEN
    v_business_id := OLD.business_id;
  ELSE
    v_business_id := NEW.business_id;
  END IF;

  UPDATE businesses
  SET
    rating_avg   = COALESCE(
                     (SELECT ROUND(AVG(rating)::NUMERIC, 2)
                      FROM reviews
                      WHERE business_id = v_business_id
                        AND status = 'approved'),
                     0
                   ),
    review_count = (SELECT COUNT(*)
                    FROM reviews
                    WHERE business_id = v_business_id
                      AND status = 'approved'),
    updated_at   = now()
  WHERE id = v_business_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
