// Run only during the initial integration verification, never as the regular build.
import { collectBluesky } from "../src/lib/collection/sources";
import { collectionSettingsSchema } from "../src/lib/collection/model";
const settings = collectionSettingsSchema.parse({
  enabled: true,
  keywords: ["밈"],
  daily_limit: 20,
  bluesky_min_engagement: 30,
  youtube_min_views: 10000,
});
try {
  const items = await collectBluesky(settings, new Date());
  console.log(
    "Bluesky source verification:",
    JSON.stringify({ candidates: items.length, provider: items[0]?.provider }),
  );
} catch (error) {
  console.log(
    "Bluesky source verification failed:",
    error instanceof Error ? error.message : "invalid response",
  );
}
