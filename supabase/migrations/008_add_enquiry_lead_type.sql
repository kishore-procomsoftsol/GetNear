-- =============================================================================
-- GetNear V1 — Add 'enquiry' lead type
-- Migration: 008_add_enquiry_lead_type.sql
-- Description: Adds 'enquiry' to the valid lead types CHECK constraint.
-- =============================================================================

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_type_check;
ALTER TABLE leads ADD CONSTRAINT leads_type_check
  CHECK (type IN ('call', 'direction', 'whatsapp', 'save', 'view', 'website', 'enquiry'));
