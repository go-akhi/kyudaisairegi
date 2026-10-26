/**
 * Creates the first admin account. Idempotent: re-running updates the password.
 * Usage: pnpm seed
 */
import { randomBytes, scryptSync } from "node:crypto";
import pg from "pg";

const { DATABASE_URL, ADMIN_USERNAME = "admin", ADMIN_PASSWORD } = process.env;

if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");
if (!ADMIN_PASSWORD) throw new Error("ADMIN_PASSWORD is not set");

const hashPassword = (password) => {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
};

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

try {
  await client.query(
    `insert into accounts (id, kind, username, password_hash)
     values ($1, 'admin', $2, $3)
     on conflict (username) do update set password_hash = excluded.password_hash, kind = 'admin'`,
    [crypto.randomUUID(), ADMIN_USERNAME, hashPassword(ADMIN_PASSWORD)],
  );
  console.log(`admin ready: ${ADMIN_USERNAME}`);
} finally {
  await client.end();
}
