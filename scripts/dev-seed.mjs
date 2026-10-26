import { createHash, randomBytes, scryptSync } from "node:crypto";
import pg from "pg";

const hash = (pw) => {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${scryptSync(pw, salt, 64).toString("hex")}`;
};

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const stallId = "11111111-1111-1111-1111-111111111111";
const catId = "33333333-3333-3333-3333-333333333333";

await client.query("delete from stalls where slug in ('takoyaki','yakisoba')");
await client.query(
  `insert into stalls (id, slug, display_name, description, location_note, sale_pct)
   values ($1,'takoyaki','Takoyaki Stand','Fresh octopus balls, made to order.','Building A, 2F, by the stage',20)`,
  [stallId],
);
await client.query(
  `insert into categories (id, stall_id, name, sort) values ($1,$2,'Food',0), ($3,$2,'Drinks',1)`,
  [catId, stallId, "44444444-4444-4444-4444-444444444444"],
);
await client.query(
  `insert into items (stall_id, category_id, name, description, price_yen, sort)
   values ($1,$2,'Takoyaki (6)','Octopus, bonito, mayo',500,0),
          ($1,$2,'Takoyaki (12)','Sharing size',900,1),
          ($1,$3,'Lemonade','Ice cold',300,0)`,
  [stallId, catId, "44444444-4444-4444-4444-444444444444"],
);

const item = await client.query("select id from items where name='Takoyaki (6)'");
await client.query(
  `insert into item_options (item_id, name, price_delta_yen) values ($1,'Extra sauce',50)`,
  [item.rows[0].id],
);

await client.query(
  `insert into accounts (id, kind, username, password_hash, stall_id)
   values (gen_random_uuid(), 'stall', 'takoyaki', $1, $2)
   on conflict (username) do update set password_hash = excluded.password_hash`,
  [hash("takoyaki123"), stallId],
);

const account = await client.query("select id from accounts where username='takoyaki'");
const admin = await client.query("select id from accounts where username='admin'");

const token = "testtoken";
const adminToken = "admintoken";

for (const [t, id] of [
  [token, account.rows[0].id],
  [adminToken, admin.rows[0].id],
]) {
  await client.query(
    `insert into sessions (id, account_id, expires_at)
     values ($1,$2, now() + interval '2 days')
     on conflict (id) do update set expires_at = excluded.expires_at`,
    [createHash("sha256").update(t).digest("hex"), id],
  );
}

console.log("seeded");
await client.end();
