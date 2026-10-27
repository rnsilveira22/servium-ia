-- 0013_resumo_diario.sql — VP-02: configuração do resumo diário por tenant.
-- Opt-in: padrão DESLIGADO — nenhum e-mail é enviado sem o admin ativar.
-- Hora em horário de Brasília (America/Sao_Paulo); inteira, 0–23.
--
-- Reversão (segura — colunas são só configuração, sem dependências):
--   ALTER TABLE tenants
--     DROP COLUMN IF EXISTS resumo_diario_ativo,
--     DROP COLUMN IF EXISTS resumo_diario_hora,
--     DROP COLUMN IF EXISTS resumo_diario_enviar_vazio;
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS resumo_diario_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resumo_diario_hora smallint NOT NULL DEFAULT 8
    CHECK (resumo_diario_hora BETWEEN 0 AND 23),
  ADD COLUMN IF NOT EXISTS resumo_diario_enviar_vazio boolean NOT NULL DEFAULT false;
