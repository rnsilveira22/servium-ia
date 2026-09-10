-- 0011_emails.sql — M1-OPS-05: e-mail do escritório por tenant (DD-05).
-- Campo nullable; o runtime usará por tenant com fallback no env (DD-06 — M1-OPS-06).
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email_escritorio text;
