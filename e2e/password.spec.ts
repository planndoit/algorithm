import { test, expect } from "@playwright/test";
test("password setup: code request, mismatch rejection and successful reset", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/auth/forget-password/email-otp", async (route) => {
    requests++;
    expect(route.request().postDataJSON()).toEqual({
      email: "admin@example.com",
    });
    await route.fulfill({ json: { success: true } });
  });
  let resets = 0;
  await page.route("**/api/auth/email-otp/reset-password", async (route) => {
    resets++;
    expect(route.request().postDataJSON()).toEqual({
      email: "admin@example.com",
      otp: "123456",
      password: "local-test-only-password",
    });
    await route.fulfill({ json: { success: true } });
  });
  await page.goto("/admin/password");
  await page.getByLabel("관리자 이메일").fill("admin@example.com");
  await page.getByRole("button", { name: "이메일로 인증코드 받기" }).click();
  await expect(page.getByLabel("이메일 인증코드")).toBeVisible();
  expect(requests).toBe(1);
  await page.getByLabel("이메일 인증코드").fill("123456");
  await page
    .getByLabel("새 비밀번호 (12자 이상)", { exact: true })
    .fill("local-test-only-password");
  await page
    .getByLabel("비밀번호 확인", { exact: true })
    .fill("wrong-test-password");
  await page
    .getByRole("button", { name: "비밀번호 설정하기", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("같지");
  expect(resets).toBe(0);
  await page
    .getByLabel("비밀번호 확인", { exact: true })
    .fill("local-test-only-password");
  await page
    .getByRole("button", { name: "비밀번호 설정하기", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("설정했어요");
  expect(resets).toBe(1);
  await expect(
    page.getByRole("link", { name: "관리자 로그인", exact: true }),
  ).toHaveAttribute("href", "/admin");
});
test("expired code shows an error and permits retry", async ({ page }) => {
  await page.route("**/api/auth/forget-password/email-otp", (route) =>
    route.fulfill({ json: { success: true } }),
  );
  await page.route("**/api/auth/email-otp/reset-password", (route) =>
    route.fulfill({ status: 400, json: { code: "INVALID_OTP" } }),
  );
  await page.goto("/admin/password");
  await page.getByLabel("관리자 이메일").fill("admin@example.com");
  await page.getByRole("button", { name: "이메일로 인증코드 받기" }).click();
  await page.getByLabel("이메일 인증코드").fill("000000");
  await page
    .getByLabel("새 비밀번호 (12자 이상)", { exact: true })
    .fill("local-test-only-password");
  await page
    .getByLabel("비밀번호 확인", { exact: true })
    .fill("local-test-only-password");
  await page
    .getByRole("button", { name: "비밀번호 설정하기", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("확인해");
  await expect(
    page.getByRole("button", { name: "비밀번호 설정하기", exact: true }),
  ).toBeEnabled();
});
