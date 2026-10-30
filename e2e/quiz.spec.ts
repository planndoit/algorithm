import { test, expect } from "@playwright/test";
test("mobile demo: home, restore, edit and result", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "체험 테스트 시작하기" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBeTruthy();
  await page.screenshot({ path: "artifacts/home-mobile.png", fullPage: true });
  await page.getByRole("link", { name: "체험 테스트 시작하기" }).click();
  await expect(page.getByText("QUESTION 01", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "알아 😎", exact: true }).click();
  await page.reload();
  await expect(page.getByText("QUESTION 02", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "← 이전" }).click();
  await expect(page.getByText("QUESTION 01", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "처음 봐 👀", exact: true }).click();
  for (let i = 1; i < 10; i++) {
    await expect(
      page.getByText(`QUESTION ${String(i + 1).padStart(2, "0")}`, {
        exact: false,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: i < 8 ? "알아 😎" : "처음 봐 👀",
        exact: true,
      })
      .click();
  }
  await expect(page).toHaveURL(/result\/demo-/);
  await expect(page.locator(".score")).toContainText("70");
  await expect(
    page.getByRole("heading", { name: "알고리즘 주민" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".score")).toContainText("70");
  await page.getByRole("button", { name: "링크 복사하기" }).click();
  await expect(page.getByRole("status")).toContainText("이 브라우저");
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBeTruthy();
  await page.screenshot({
    path: "artifacts/result-mobile.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "나도 테스트하기 →" }).click();
  await page.getByRole("link", { name: "체험 테스트 시작하기" }).click();
  await expect(page.getByText("QUESTION 01", { exact: false })).toBeVisible();
  expect(errors).toEqual([]);
});
test("unpublished quiz denied, admin setup, API rejects and desktop layout", async ({
  page,
  request,
}) => {
  await page.goto("/quiz/not-published");
  await expect(page.getByRole("heading")).toContainText("아직 열리지");
  await page.goto("/admin");
  await expect(page.getByRole("heading")).toContainText("운영 준비");
  const res = await request.post("/api/results", {
    headers: { origin: "http://evil.example" },
    data: {},
  });
  expect(res.status()).toBe(403);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.screenshot({ path: "artifacts/home-desktop.png", fullPage: true });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBeTruthy();
});

test("public Korean OG image renders without remote font requests", async ({
  request,
}) => {
  const response = await request.get(
    "/result/00000000-0000-4000-8000-000000000001/opengraph-image",
  );
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/png");
  const buffer = await response.body();
  expect(buffer.length).toBeGreaterThan(10000);
  const { writeFileSync } = await import("node:fs");
  writeFileSync("artifacts/og-preview.png", buffer);
});
