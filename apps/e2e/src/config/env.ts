export const ENV = {
  WEB_URL: process.env.E2E_WEB_URL ?? 'http://localhost:5173',
  API_URL: process.env.E2E_API_URL ?? 'http://localhost:3000',
  HEADLESS: process.env.HEADLESS !== '0',
  SLUG: process.env.E2E_SLUG ?? 'dev-corp',
  EMAIL: process.env.E2E_EMAIL ?? 'admin@dev.local',
  PASSWORD: process.env.E2E_PASSWORD ?? 'admin-dev-corp-2026',
};
