// Wendet das Prisma-Schema beim (Vercel-)Build automatisch an.
//
// - Nutzt bevorzugt eine NICHT-gepoolte Verbindung (POSTGRES_URL_NON_POOLING
//   bzw. DATABASE_URL_UNPOOLED), fällt sonst auf DATABASE_URL zurück.
// - Ist KEINE Datenbank-URL gesetzt (z. B. lokaler Build), wird der Schritt
//   übersprungen und der Build NICHT abgebrochen.
// - Verwendet NIEMALS --accept-data-loss oder --force-reset.

import { spawnSync } from 'node:child_process';

const dbUrl =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL ||
  '';

if (!dbUrl) {
  console.log(
    '[db-push] Keine Datenbank-URL gesetzt (POSTGRES_URL_NON_POOLING / DATABASE_URL_UNPOOLED / DATABASE_URL) — Schema-Push wird übersprungen.'
  );
  process.exit(0);
}

const source = process.env.POSTGRES_URL_NON_POOLING
  ? 'POSTGRES_URL_NON_POOLING'
  : process.env.DATABASE_URL_UNPOOLED
  ? 'DATABASE_URL_UNPOOLED'
  : 'DATABASE_URL';

console.log(`[db-push] Wende Prisma-Schema an (Verbindung aus ${source}, nicht-gepoolt bevorzugt).`);

const result = spawnSync(
  'npx',
  ['prisma', 'db', 'push', '--skip-generate'],
  {
    stdio: 'inherit',
    // Prisma liest DATABASE_URL aus der Umgebung (siehe schema.prisma).
    // Für db push erzwingen wir die nicht-gepoolte Verbindung.
    env: { ...process.env, DATABASE_URL: dbUrl },
  }
);

if (result.status !== 0) {
  console.error('[db-push] prisma db push ist fehlgeschlagen.');
  process.exit(result.status ?? 1);
}

console.log('[db-push] Schema erfolgreich angewendet.');
