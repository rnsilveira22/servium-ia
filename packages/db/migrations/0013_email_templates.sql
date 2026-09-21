-- 0013_email_templates.sql — Modelos de e-mail padrão (DD do dia).
-- Modelos definem o ASSUNTO/corpo das solicitações que o motor envia. Um
-- checklist (checklist_templates) pode apontar para um modelo; quando o ciclo
-- dispara uma cobrança, o motor renderiza os placeholders sobre o modelo.
-- Sem modelo: comportamento anterior (texto embutido fixo).

CREATE TABLE email_templates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id),
  nome       text NOT NULL,
  assunto    text NOT NULL,
  corpo      text NOT NULL,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

-- Checklist → modelo de e-mail padrão (um por checklist; null = texto fixo).
ALTER TABLE checklist_templates
  ADD COLUMN IF NOT EXISTS email_template_id uuid REFERENCES email_templates(id) ON DELETE SET NULL;

-- RLS deny-by-default (mesmo padrão ADR-005 de 0003/0006).
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON email_templates
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON email_templates TO servium_app;

CREATE INDEX idx_email_templates_tenant_criado
  ON email_templates (tenant_id, criado_em DESC);