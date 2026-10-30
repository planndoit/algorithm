import { test, expect } from "@playwright/test";
test("admin library, schedule and editing routes require a verified admin session", async ({
  page,
}) => {
  for (const path of [
    "/admin/contents",
    "/admin/exposure",
    "/admin/contents/new",
    "/admin/exposure/new",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading")).toContainText("운영 준비");
  }
  const response = await page.goto("/qa-admin-local");
  expect(response?.status()).toBe(404);
});
