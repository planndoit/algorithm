import { test, expect } from "@playwright/test";
test.skip(
  !process.env.ADMIN_UI_QA,
  "Isolated local component fixture only; no auth bypass is deployed.",
);
test("content library and requested form fields", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/qa-admin-local", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "콘텐츠 관리", exact: true }),
  ).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(14);
  await expect(
    page.getByRole("navigation", { name: "관리자 메뉴" }),
  ).toContainText("문제 노출 관리");
  await page.screenshot({
    path: "artifacts/admin-contents-desktop.png",
    fullPage: true,
  });
  await page.goto("/qa-admin-local?screen=content", {
    waitUntil: "networkidle",
  });
  for (const label of [
    "제목 *",
    "계정 / 크리에이터",
    "계정 URL",
    "알고리즘 콘텐츠 URL *",
    "발견일 *",
    "유행 시작일",
    "유형",
    "플랫폼",
    "난이도",
    "설명",
    "관리자 메모",
  ])
    await expect(page.getByLabel(label, { exact: false })).toBeVisible();
  await page.screenshot({
    path: "artifacts/admin-content-edit.png",
    fullPage: true,
  });
});
test("schedule list and visual problem selection / ordering", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/qa-admin-local?screen=exposure", {
    waitUntil: "networkidle",
  });
  await expect(page.locator(".exposure-card")).toHaveCount(3);
  await expect(page.locator(".exposure-card .status-chip")).toHaveText([
    "노출 중",
    "예약됨",
    "임시저장",
  ]);
  await page.screenshot({
    path: "artifacts/admin-exposure-desktop.png",
    fullPage: true,
  });
  await page.goto("/qa-admin-local?screen=editor", {
    waitUntil: "networkidle",
  });
  await expect(page.locator(".selected-list li")).toHaveCount(6);
  const firstBefore = await page
    .locator(".selected-list li strong")
    .first()
    .innerText();
  await page
    .getByRole("button", { name: "1번 문제 아래로", exact: true })
    .click();
  await expect(page.locator(".selected-list li strong").nth(1)).toHaveText(
    firstBefore,
  );
  const candidates = page.getByRole("checkbox");
  await expect(candidates).toHaveCount(10);
  for (let i = 6; i < 10; i++) await candidates.nth(i).check();
  await expect(page.locator(".selected-list li")).toHaveCount(10);
  await expect(page.locator(".count-complete")).toHaveText("10 / 10");
  const value = await page.locator('input[name="ordered_ids"]').inputValue();
  expect(new Set(value.split(",")).size).toBe(10);
  await page
    .getByRole("button", { name: "2번 문제 제거", exact: true })
    .click();
  await expect(page.locator(".selected-list li")).toHaveCount(9);
  await page.getByRole("textbox", { name: "출제 콘텐츠 검색" }).fill("소개");
  await expect(page.getByRole("checkbox")).toHaveCount(2);
  await page.screenshot({
    path: "artifacts/admin-editor-desktop.png",
    fullPage: true,
  });
});
test("mobile workspace stays within viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const screen of ["", "editor", "exposure", "content"]) {
    await page.goto("/qa-admin-local?screen=" + screen, {
      waitUntil: "networkidle",
    });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
  }
  await page.screenshot({ path: "artifacts/admin-mobile.png", fullPage: true });
});
