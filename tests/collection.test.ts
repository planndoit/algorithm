import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import {
  blueskyCandidates,
  youtubeCandidates,
} from "../src/lib/collection/sources";
import {
  collectionSettingsSchema,
  kstDay,
  rankCandidates,
  type Candidate,
} from "../src/lib/collection/model";
const settings = collectionSettingsSchema.parse({
  enabled: true,
  keywords: ["밈"],
  daily_limit: 1,
  bluesky_min_engagement: 30,
  youtube_min_views: 10000,
});
const now = new Date("2026-10-30T10:00:00Z");
const post = {
  uri: "at://did:plc:example/app.bsky.feed.post/abc123",
  author: { did: "did:plc:example", handle: "example.bsky.social" },
  record: {
    text: "요즘 유행하는 밈 https://example.com",
    createdAt: "2026-10-29T10:00:00Z",
  },
  likeCount: 100,
  repostCount: 10,
  replyCount: 5,
};
test("provider evidence: recent Korean engagement, canonical URLs, filters and honest ranking", () => {
  const items = blueskyCandidates(
    {
      posts: [
        post,
        { ...post, record: { ...post.record, createdAt: "2020-01-01" } },
        { ...post, record: { ...post.record, reply: {} } },
        { ...post, labels: [{ val: "porn" }] },
        { ...post, likeCount: 0, repostCount: 0, replyCount: 0 },
        { ...post, record: { ...post.record, text: "meme english only" } },
      ],
    },
    settings,
    now,
  );
  assert.equal(items.length, 1);
  assert.equal(
    items[0].source_url,
    "https://bsky.app/profile/did%3Aplc%3Aexample/post/abc123",
  );
  assert.equal(items[0].score, 5.21);
  assert.equal(items[0].title, "요즘 유행하는 밈");
  assert.equal(rankCandidates([...items, ...items]).length, 1);
  assert.equal(kstDay(new Date("2026-10-30T16:00:00Z")), "2026-10-31");
  assert.equal(
    collectionSettingsSchema.safeParse({ ...settings, keywords: [] }).success,
    false,
  );
  const video = {
    id: "abc12345678",
    snippet: {
      title: "밈 챌린지",
      channelId: "UCexample",
      channelTitle: "creator",
      publishedAt: "2026-10-29T10:00:00Z",
    },
    statistics: { viewCount: "20000" },
  };
  const videos = youtubeCandidates(
    { items: [video, { ...video, statistics: { viewCount: "12" } }] },
    settings,
    now,
  );
  assert.equal(videos.length, 1);
  assert.equal(videos[0].metrics.views, 20000);
  assert.equal(videos[0].platform, "YouTube");
  assert.throws(() => blueskyCandidates({ error: "upstream" }, settings, now));
});
test("collection transactions: single lease, daily budget, preserve edits and exclusions, metrics refresh and RLS", async () => {
  const db = new PGlite({ extensions: { btree_gist } });
  try {
    for (const f of readdirSync("database/migrations").sort())
      await db.exec(readFileSync(`database/migrations/${f}`, "utf8"));
    await db.exec("update collection_settings set daily_limit=1");
    const claim = async (key: string) =>
      (
        await db.query<{ id: string | null }>(
          "select claim_collection($1,'manual') id",
          [key],
        )
      ).rows[0].id;
    const id = await claim("first");
    assert.ok(id);
    assert.equal(await claim("overlap"), null);
    const a: Candidate = blueskyCandidates({ posts: [post] }, settings, now)[0];
    const b = {
      ...a,
      source_url: a.source_url + "2",
      external_id: a.external_id + "2",
    };
    const ingest = async (run: string, items: Candidate[]) =>
      (
        await db.query<{ counts: { inserted: number; duplicates: number } }>(
          "select ingest_collection($1,$2::jsonb) counts",
          [run, JSON.stringify(items)],
        )
      ).rows[0].counts;
    assert.equal((await ingest(id, [a, b])).inserted, 1);
    await db.exec(
      "update contents set title='수정한 제목',status='excluded',admin_notes='관리자 메모';update collection_runs set status='succeeded',finished_at=now()",
    );
    const refresh = await ingest(id, [{ ...a, metrics: { likes: 200 } }]).then(
      () => false,
      () => true,
    );
    assert.equal(refresh, true);
    await db.exec(
      "update collection_runs set started_at=now()-interval '11 minutes'",
    );
    const second = await claim("second");
    assert.ok(second);
    const saved = await ingest(second, [{ ...a, metrics: { likes: 200 } }, b]);
    assert.deepEqual(saved, { inserted: 0, duplicates: 1 });
    const [row] = (
      await db.query<{
        title: string;
        status: string;
        metrics: { likes: number };
        previous_metrics: { likes: number };
        admin_notes: string;
      }>(
        "select c.title,c.status,c.admin_notes,o.metrics,o.previous_metrics from contents c join collection_observations o on o.content_id=c.id",
      )
    ).rows;
    assert.equal(row.title, "수정한 제목");
    assert.equal(row.status, "excluded");
    assert.equal(row.admin_notes, "관리자 메모");
    assert.equal(row.metrics.likes, 200);
    assert.equal(row.previous_metrics.likes, 100);
    await db.exec(
      "update collection_runs set started_at=now()-interval '11 minutes' where status='running'",
    );
    assert.ok(await claim("recovered"));
    assert.equal(
      (
        await db.query<{ status: string }>(
          "select status from collection_runs where run_key='second'",
        )
      ).rows[0].status,
      "failed",
    );
    await db.exec("create role collector_public;set role collector_public");
    await assert.rejects(
      () => db.query("select * from collection_runs"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
