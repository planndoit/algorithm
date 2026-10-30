import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { parseKst, kstInput, exposure, contentSchema } from "../src/lib/admin";
test("KST date handling is stable across host timezones and rejects impossible dates", () => {
  assert.equal(parseKst("2026-11-06T00:00"), "2026-11-05T15:00:00.000Z");
  assert.equal(kstInput("2026-11-05T15:00:00Z"), "2026-11-06T00:00");
  assert.throws(() => parseKst("2026-02-31T12:00"));
  assert.throws(() => parseKst("2026-11-01"));
  const now = Date.parse("2026-11-01T00:00:00Z");
  assert.equal(
    exposure(
      { status: "published", starts_at: "2026-11-02", ends_at: "2026-11-03" },
      now,
    ).key,
    "scheduled",
  );
  assert.equal(
    exposure(
      { status: "published", starts_at: "2026-10-31", ends_at: "2026-11-02" },
      now,
    ).key,
    "live",
  );
  assert.equal(
    exposure(
      { status: "published", starts_at: "2026-10-30", ends_at: "2026-10-31" },
      now,
    ).key,
    "ended",
  );
});
test("requested content fields validate separate account and content URLs", () => {
  const value = {
    title: "Sample",
    creator: "Sample creator",
    account_url: "https://example.com/account",
    source_url: "https://example.com/post",
    discovered_at: "2026-10-30",
    trending_at: "",
    category: "밈",
    platform: "Threads",
    difficulty: "보통",
    description: "Sample",
    admin_notes: "Private",
    status: "pending",
    thumbnail_url: "",
  };
  assert.equal(contentSchema.safeParse(value).success, true);
  assert.equal(
    contentSchema.safeParse({ ...value, account_url: "javascript:alert(1)" })
      .success,
    false,
  );
  assert.equal(
    contentSchema.safeParse({ ...value, source_url: "" }).success,
    false,
  );
});
test("admin samples: review inbox, scheduled sets, idempotent seed and immutable sample labels", async () => {
  const db = new PGlite({ extensions: { btree_gist } });
  try {
    for (const file of readdirSync("database/migrations").sort())
      await db.exec(readFileSync(`database/migrations/${file}`, "utf8"));
    const seed = readFileSync("database/seeds/admin_samples.sql", "utf8");
    await db.exec(seed);
    await db.exec(seed);
    const rows = await db.query<{
      total: number;
      approved: number;
      pending: number;
    }>(
      `select count(*)::int total,count(*) filter(where status='approved')::int approved,count(*) filter(where status='pending')::int pending from public.contents`,
    );
    assert.deepEqual(rows.rows[0], { total: 14, approved: 10, pending: 3 });
    const sets = await db.query<{
      id: string;
      status: string;
      is_sample: boolean;
      count: number;
    }>(
      `select s.id,s.status,s.is_sample,(select count(*)::int from quiz_questions q where q.quiz_id=s.id) count from quiz_sets s order by starts_at`,
    );
    assert.deepEqual(
      sets.rows.map((s) => [s.status, s.is_sample, s.count]),
      [
        ["published", true, 10],
        ["published", true, 10],
        ["draft", true, 6],
      ],
    );
    const q = sets.rows[0].id;
    const snapshot = await db.query<{ snapshot: Record<string, unknown> }>(
      `select snapshot from quiz_questions where quiz_id=$1 limit 1`,
      [q],
    );
    assert.equal(snapshot.rows[0].snapshot.is_sample, true);
    assert.ok(snapshot.rows[0].snapshot.account_url);
    assert.equal("admin_notes" in snapshot.rows[0].snapshot, false);
    await assert.rejects(
      () => db.query(`update quiz_sets set is_sample=false where id=$1`, [q]),
      /immutable/,
    );
    const pending = (
      await db.query<{ id: string }>(
        `select id from contents where status='pending' limit 1`,
      )
    ).rows[0].id;
    await assert.rejects(
      () =>
        db.query(
          `select save_quiz(null,'Not approved','2030-01-01','2030-01-08',array[$1::uuid])`,
          [pending],
        ),
      /Approved content/,
    );
    const counts = await db.query<{ live: number; scheduled: number }>(
      `select count(*) filter(where status='published' and starts_at<=now() and ends_at>now())::int live,count(*) filter(where status='published' and starts_at>now())::int scheduled from quiz_sets`,
    );
    assert.deepEqual(counts.rows[0], { live: 1, scheduled: 1 });
  } finally {
    await db.close();
  }
});
