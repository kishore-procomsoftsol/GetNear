-- Migration: 008_add_reply_text_to_reviews.sql
-- Description: Adds reply_text column to reviews table for business owner replies

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reply_text TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;
