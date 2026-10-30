import { existsSync } from "node:fs";
if (existsSync("src/app/qa-admin-local/page.tsx")) {
  throw Error(
    "Temporary local admin UI fixture is present. Stop the QA run before production build.",
  );
}
