-- Migration: 007_add_agent_role.sql
-- Adds 'agent' to the allowed user roles

-- Drop and recreate the role check constraint to include 'agent'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('customer', 'business', 'admin', 'agent'));
