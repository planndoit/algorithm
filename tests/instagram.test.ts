import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import {
  instagramCandidates,
  instagramConfig,
  collectInstagram,
  checkInstagramAccount,
} from "../src/lib/collection/instagram";
import { collectionSettingsSchema } from "../src/lib/collection/model";
const settings = collectionSettingsSchema.parse({
  enabled: true,
  keywords: ["밈"],
  daily_limit: 20,
  bluesky_min_engagement: 30,
  youtube_min_views: 10000,
  instagram_hashtags: ["밈"],
  instagram_min_likes: 100,
});
const now = new Date("2026-10-30T10:00:00Z");
const media = {
  id: "123456",
  caption: "유행 중인 한국어 밈",
  permalink: "https://www.instagram.com/reel/Abc_123/?igsh=tracking",
  timestamp: "2026-10-29T10:00:00Z",
  media_type: "VIDEO",
  like_count: 240,
  comments_count: 20,
};
test("Instagram candidates preserve evidence without inventing author or hidden metrics", () => {
  const candidates = instagramCandidates(
    {
      data: [
        media,
        { ...media, id: "2", like_count: undefined },
        { ...media, id: "3", timestamp: "2020-01-01" },
        { ...media, id: "4", permalink: "https://evil.example/reel/a/" },
        { ...media, id: "5", caption: "English only" },
      ],
    },
    settings,
    now,
    "밈",
  );
  assert.equal(candidates.length, 1);
  const c = candidates[0];
  assert.equal(c.source_url, "https://www.instagram.com/reel/Abc_123/");
  assert.equal(c.creator, "");
  assert.equal(c.account_url, "");
  assert.equal(c.platform, "Instagram");
  assert.equal(c.score, 10);
  assert.equal(c.metrics.likes, 240);
  assert.equal("views" in c.metrics, false);
  assert.equal(
    instagramConfig({
      INSTAGRAM_ACCESS_TOKEN: "secret",
      INSTAGRAM_BUSINESS_ACCOUNT_ID: "not-a-number",
    }),
    null,
  );
  assert.equal(
    collectionSettingsSchema.safeParse({
      ...settings,
      instagram_hashtags: ["공백 태그"],
    }).success,
    false,
  );
});
test("Instagram requests use fixed Meta origin, bearer secret, documented fields and safe auth failures", async () => {
  const original = globalThis.fetch;
  const config = {
    token: "private-test-token",
    accountId: "99999",
    version: "v26.0",
  };
  const calls: URL[] = [];
  try {
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      calls.push(url);
      assert.equal(url.origin, "https://graph.facebook.com");
      assert.equal(url.search.includes(config.token), false);
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        `Bearer ${config.token}`,
      );
      assert.equal(init?.redirect, "error");
      return Response.json(
        url.pathname.endsWith("ig_hashtag_search")
          ? { data: [{ id: "123" }] }
          : { data: [media], paging: { next: "https://evil.example/" } },
      );
    };
    const found = await collectInstagram(settings, now, config);
    assert.equal(found.length, 1);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].pathname, "/v26.0/123/top_media");
    assert.equal(
      calls[1].searchParams.get("fields")?.includes("username"),
      false,
    );
    globalThis.fetch = async () =>
      Response.json(
        {
          error: {
            code: 190,
            message: "private-test-token provider raw message",
          },
        },
        { status: 400 },
      );
    await assert.rejects(
      () => checkInstagramAccount(config),
      (error) =>
        error instanceof Error &&
        error.message.includes("인증 만료") &&
        !error.message.includes(config.token),
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("Instagram rolling hashtag budget and schema accept the new provider", async () => {
  const db = new PGlite({ extensions: { btree_gist } });
  try {
    for (const f of readdirSync("database/migrations").sort())
      await db.exec(readFileSync(`database/migrations/${f}`, "utf8"));
    const reserve = async (tags: string[]) =>
      (
        await db.query<{ ok: boolean }>(
          "select reserve_instagram_hashtags($1,$2::text[]) ok",
          ["999", tags],
        )
      ).rows[0].ok;
    assert.equal(
      await reserve(Array.from({ length: 30 }, (_, i) => "tag" + i)),
      true,
    );
    assert.equal(await reserve(["tag0"]), true);
    assert.equal(await reserve(["newtag"]), false);
    await db.exec(
      "update instagram_hashtag_usage set last_requested_at=now()-interval '8 days' where hashtag='tag1'",
    );
    assert.equal(await reserve(["newtag"]), true);
    const r = (
      await db.query<{ id: string }>(
        "select claim_collection('instagram-test','manual') id",
      )
    ).rows[0].id;
    const items = instagramCandidates({ data: [media] }, settings, now, "밈");
    await db.query("select ingest_collection($1,$2::jsonb)", [
      r,
      JSON.stringify(items),
    ]);
    const row = (
      await db.query<{ platform: string; status: string; provider: string }>(
        "select c.platform,c.status,o.provider from contents c join collection_observations o on c.id=o.content_id",
      )
    ).rows[0];
    assert.deepEqual(row, {
      platform: "Instagram",
      status: "pending",
      provider: "instagram",
    });
    await db.exec("create role instagram_anon;set role instagram_anon");
    await assert.rejects(
      () => db.query("select * from collection_provider_checks"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
