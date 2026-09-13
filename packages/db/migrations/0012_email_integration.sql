-- 0012_email_integration.sql — B-2 R3: integração de e-mail por tenant.
-- Provider-agnóstico: propaga apenas configuração (provider, remetente, mailbox);
-- NENHUM segredo aqui — `credential_reference` é referência para o segredo real,
-- que permanece fora do core (ex.: gmail_tokens com RLS FORCE; futuro secret manager).

CREATE TABLE tenant_email_integration (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid NOT NULL REFERENCES tenants(id),
  provider             text NOT NULL CHECK (provider IN ('gmail','mailpit')),
  sender_email         text,
  mailbox_email        text,
  auth_type            text NOT NULL DEFAULT 'none' CHECK (auth_type IN ('none','oauth2')),
  credential_reference text,
  send_enabled         boolean NOT NULL DEFAULT true,
  receive_enabled      boolean NOT NULL DEFAULT true,
  status               text NOT NULL DEFAULT 'nao_configurado'
                       CHECK (status IN ('nao_configurado','configurado','erro')),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider)
);

ALTER TABLE tenant_email_integration ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_email_integration FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tenant_email_integration
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE INDEX idx_tenant_email_integration_tenant ON tenant_email_integration(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_email_integration TO servium_app;