import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
test("PostgreSQL: publish, snapshots, scoring, idempotency, constraints and access", async () => {
  const db = new PGlite({ extensions: { btree_gist } });
  try {
    await db.exec(`create role anonymous_test;`);
    const migrations = readdirSync("database/migrations")
      .filter((n) => n.endsWith(".sql"))
      .sort();
    for (const f of migrations)
      await db.exec(readFileSync(`database/migrations/${f}`, "utf8"));
    const ids: string[] = [];
    for (let i = 0; i < 10; i++) {
      const c = await db.query<{ id: string }>(
        `insert into contents(title,category,platform,source_url,status,admin_notes) values($1,'밈','기타',$2,'approved','PRIVATE') returning id`,
        [`sample ${i}`, `https://example.com/${i}`],
      );
      ids.push(c.rows[0].id);
    }
    const save = async (
      contents: string[],
      start = "2020-01-01",
      end = "2090-01-01",
    ) =>
      (
        await db.query<{ id: string }>(
          `select save_quiz(null,'sample',$1,$2,$3::uuid[]) id`,
          [start, end, contents],
        )
      ).rows[0].id;
    const incomplete = await save(ids.slice(0, 9), "2100-01-01", "2101-01-01");
    await assert.rejects(
      () =>
        db.query(`update quiz_sets set status='published' where id=$1`, [
          incomplete,
        ]),
      /Exactly 10/,
    );
    const q = await save(ids);
    await db.query(`update quiz_sets set status='published' where id=$1`, [q]);
    const snapshot = await db.query<{ snapshot: Record<string, unknown> }>(
      `select snapshot from quiz_questions where quiz_id=$1`,
      [q],
    );
    assert.equal(snapshot.rows.length, 10);
    assert.equal("admin_notes" in snapshot.rows[0].snapshot, false);
    await db.query(`update contents set title='changed' where id=$1`, [ids[0]]);
    assert.notEqual(
      (
        await db.query<{ snapshot: { title: string } }>(
          `select snapshot from quiz_questions where quiz_id=$1 and position=0`,
          [q],
        )
      ).rows[0].snapshot.title,
      "changed",
    );
    await assert.rejects(
      () => db.query(`delete from quiz_questions where quiz_id=$1`, [q]),
      /immutable/,
    );
    await assert.rejects(
      () => db.query(`update quiz_sets set locked=false where id=$1`, [q]),
      /immutable/,
    );
    const overlap = await save(ids);
    await assert.rejects(
      () =>
        db.query(`update quiz_sets set status='published' where id=$1`, [
          overlap,
        ]),
      /exclusion/,
    );
    const request = crypto.randomUUID();
    const answers = Array.from({ length: 10 }, (_, i) => i < 8);
    const submit = async (a = answers, r = request) =>
      (
        await db.query<{ id: string }>(
          `select submit_result($1,$2,$3::boolean[],'test-actor') id`,
          [q, r, a],
        )
      ).rows[0].id;
    const result = await submit();
    assert.equal(await submit(), result);
    await assert.rejects(() => submit(Array(10).fill(false)), /already used/);
    assert.equal(
      (
        await db.query<{ score: number }>(
          `select score from quiz_results where id=$1`,
          [result],
        )
      ).rows[0].score,
      80,
    );
    assert.equal(
      (
        await db.query(`select * from quiz_answers where result_id=$1`, [
          result,
        ])
      ).rows.length,
      10,
    );
    await assert.rejects(
      () => submit([true], crypto.randomUUID()),
      /10 boolean/,
    );
    await db.exec("set role anonymous_test");
    await assert.rejects(
      () => db.query("select * from contents"),
      /permission denied/,
    );
    await assert.rejects(
      () => db.query("select * from quiz_results"),
      /permission denied/,
    );
    await assert.rejects(
      () => submit(answers, crypto.randomUUID()),
      /permission denied/,
    );
    await db.exec("reset role");
    await db.query(`update quiz_sets set status='ended' where id=$1`, [q]);
    await assert.rejects(
      () => submit(answers, crypto.randomUUID()),
      /unavailable/,
    );
    assert.equal(
      (await db.query(`select * from quiz_results where id=$1`, [result])).rows
        .length,
      1,
    );
  } finally {
    await db.close();
  }
});
