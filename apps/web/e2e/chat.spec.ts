import { expect, test } from '@playwright/test';

test('create room and wait', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create New Room' }).click();
  await expect(page).toHaveURL(/\/room\/[A-Z0-9]{8}\/?$/);
  await expect(page.getByText('Waiting for peer')).toBeVisible();
});

test('full connection and message exchange', async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  await pageA.goto('/');
  await pageA.getByRole('button', { name: 'Create New Room' }).click();
  await pageA.waitForURL(/\/room\/[A-Z0-9]{8}/);
  const roomUrl = pageA.url();

  await pageB.goto(roomUrl);

  await expect(pageA.getByText('Connected')).toBeVisible({ timeout: 15_000 });
  await expect(pageB.getByText('Connected')).toBeVisible({ timeout: 15_000 });

  await pageA.getByLabel('Message input').fill('Hello from A');
  await pageA.getByLabel('Send message').click();
  await expect(pageB.getByText('Hello from A')).toBeVisible();

  await pageB.getByLabel('Message input').fill('Hello from B');
  await pageB.getByLabel('Send message').click();
  await expect(pageA.getByText('Hello from B')).toBeVisible();

  await contextA.close();
  await contextB.close();
});

test('room not found for invalid code', async ({ page }) => {
  await page.goto('/room/!!!');
  await expect(page.getByText(/room not found/i)).toBeVisible();
});

test('room full rejection', async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const contextC = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  const pageC = await contextC.newPage();

  await pageA.goto('/');
  await pageA.getByRole('button', { name: 'Create New Room' }).click();
  await pageA.waitForURL(/\/room\/[A-Z0-9]{8}/);
  const roomUrl = pageA.url();

  await pageB.goto(roomUrl);
  await expect(pageA.getByText('Connected')).toBeVisible({ timeout: 15_000 });
  await expect(pageB.getByText('Connected')).toBeVisible({ timeout: 15_000 });

  await pageC.goto(roomUrl);
  await expect(pageC.getByText(/room full/i)).toBeVisible({ timeout: 10_000 });

  await contextA.close();
  await contextB.close();
  await contextC.close();
});
