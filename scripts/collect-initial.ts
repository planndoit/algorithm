// Optional one-time deployment verification. Not part of the normal build.
// Run only on the linked production project; uses today's idempotent cron key.
import { runCollection } from "../src/lib/collection/runner";
if (
  process.env.VERCEL_ENV !== "production" ||
  process.env.VERCEL_PROJECT_ID !== "prj_e7lGNUx51UfDOnwTYNRzyLG5PguP"
)
  throw Error("Production project verification required");
console.log("Initial collection:", JSON.stringify(await runCollection("cron")));
