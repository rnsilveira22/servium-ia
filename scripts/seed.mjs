import pg from 'pg';
import { hash } from '@node-rs/argon2';
import { validarPoliticaSenha, mensagemPoliticaSenha } from '../packages/db/src/security/password-policy.ts';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://servium:servium_dev@localhost:5432/servium';

const TENANT_NAME = process.env.SEED_TENANT ?? 'Dev Corp';
const ADMIN_EMAIL = process.env.SEED_EMAIL ?? 'admin@dev.local';
const ADMIN_PASS = process.env.SEED_PASSWORD ?? 'admin-dev-corp-2026';
const OPERATOR_EMAIL = process.env.SEED_OPERATOR_EMAIL ?? 'oper@dev.local';
const OPERATOR_PASS = process.env.SEED_OPERATOR_PASSWORD ?? 'oper-dev-corp-2026';

async function main() {
  // Issue #54 (CA-A-2): seed falha com senhas fora da política ASVS/NIST.
  for (const [nome, senha] of [['SEED_PASSWORD (admin)', ADMIN_PASS], ['SEED_OPERATOR_PASSWORD', OPERATOR_PASS]]) {
    const validacao = validarPoliticaSenha(senha);
    if (!validacao.ok) {
      console.error(`Seed bloqueado: ${nome} fora da política de senha: ${mensagemPoliticaSenha(validacao.motivo)}`);
      process.exit(1);
    }
  }

  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    // tenant
    const { rows: existing } = await client.query(
      `SELECT id FROM tenants WHERE slug = 'dev-corp' LIMIT 1`
    );

    let tenantId;
    if (existing.length > 0) {
      tenantId = existing[0].id;
      console.log(`Tenant already exists: ${tenantId}`);
    } else {
      const { rows } = await client.query(
        `INSERT INTO tenants (nome, slug) VALUES ($1, 'dev-corp') RETURNING id`,
        [TENANT_NAME]
      );
      tenantId = rows[0].id;
      console.log(`Created tenant: ${tenantId}`);
    }

    // admin user
    const { rows: existingOp } = await client.query(
      `SELECT id FROM operadores WHERE tenant_id = $1 AND lower(email) = lower($2) LIMIT 1`,
      [tenantId, ADMIN_EMAIL]
    );

    if (existingOp.length > 0) {
      console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
    } else {
      const senhaHash = await hash(ADMIN_PASS);
      await client.query(
        `INSERT INTO operadores (tenant_id, nome, email, senha_hash, papel)
         VALUES ($1, 'Admin', $2, $3, 'admin')`,
        [tenantId, ADMIN_EMAIL, senhaHash]
      );
      console.log(`Created admin user: ${ADMIN_EMAIL}`);
    }

    // operator user (permite validar RBAC nos testes E2E)
    const { rows: existingOp2 } = await client.query(
      `SELECT id FROM operadores WHERE tenant_id = $1 AND lower(email) = lower($2) LIMIT 1`,
      [tenantId, OPERATOR_EMAIL]
    );

    if (existingOp2.length > 0) {
      console.log(`Operator user already exists: ${OPERATOR_EMAIL}`);
    } else {
      const senhaHash = await hash(OPERATOR_PASS);
      await client.query(
        `INSERT INTO operadores (tenant_id, nome, email, senha_hash, papel)
         VALUES ($1, 'Operador', $2, $3, 'operador')`,
        [tenantId, OPERATOR_EMAIL, senhaHash]
      );
      console.log(`Created operator user: ${OPERATOR_EMAIL}`);
    }

    console.log(`\nLogin credentials:
  slug:   dev-corp
  email:  ${ADMIN_EMAIL}
  senha:  ${ADMIN_PASS}
  op.email: ${OPERATOR_EMAIL}
  op.senha: ${OPERATOR_PASS}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
