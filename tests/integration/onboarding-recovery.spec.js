import { test, expect } from '@playwright/test';
import { installSinglePutFailure, readStore, restorePut } from './helpers.js';

test('every onboarding checkpoint survives reload and page recreation', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.locator('#persistenceLoading')).toBeHidden();
  await page.locator('#obName').fill('Recovery User');
  await page.locator('#obWeight').fill('72.4');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Choose three days you can defend.' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Choose three days you can defend.' })).toBeVisible();

  await page.getByRole('button', { name: /Friday/ }).click();
  await page.getByRole('button', { name: /Tuesday/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Make every load unambiguous.' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Make every load unambiguous.' })).toBeVisible();

  await page.getByRole('button', { name: /Temporarily unavailable/ }).click();
  await page.locator('#obBarSource').selectOption('estimated');
  await page.locator('#obBarWeight').fill('10');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Choose your coaching defaults.' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Choose your coaching defaults.' })).toBeVisible();

  await page.getByRole('button', { name: /Chimes only/i }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: /Begin Week 1/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: /Begin Week 1/ })).toBeVisible();
  expect((await readStore(page, 'appMeta'))[0].onboardingCompletedAt).toBeNull();

  await page.close();
  const reopened = await context.newPage();
  await reopened.goto('/');
  await expect(reopened.locator('#persistenceLoading')).toBeHidden();
  await expect(reopened.getByRole('heading', { name: /Begin Week 1/ })).toBeVisible();
  await reopened.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(reopened.getByRole('button', { name: /Chimes only/i })).toHaveClass(/selected/);
  await reopened.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(reopened.locator('#obBarSource')).toHaveValue('estimated');
  await expect(reopened.locator('#obBarWeight')).toHaveValue('10');
  await expect(reopened.getByRole('button', { name: /Temporarily unavailable/ })).toHaveClass(/selected/);
  await reopened.getByRole('button', { name: 'Back', exact: true }).click();
  await reopened.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(reopened.locator('#obName')).toHaveValue('Recovery User');
  await expect(reopened.locator('#obWeight')).toHaveValue('72.4');
});

test('failed atomic completion remains retryable and does not open Today', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#persistenceLoading')).toBeHidden();
  await page.locator('#obName').fill('Atomic User');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Choose three days you can defend.' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Make every load unambiguous.' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Choose your coaching defaults.' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('button', { name: 'Begin Week 1' })).toBeVisible();
  await installSinglePutFailure(page, 'programmeStates');
  await page.getByRole('button', { name: 'Begin Week 1' }).click();
  await expect(page.locator('#onboardingPersistenceError')).toContainText('Could not complete onboarding');
  await expect(page.locator('#onboardingLayer')).toBeVisible();
  expect((await readStore(page, 'appMeta'))[0].onboardingCompletedAt).toBeNull();
  expect(await readStore(page, 'programmeStates')).toEqual([]);
  await restorePut(page);
  await page.getByRole('button', { name: 'Begin Week 1' }).click();
  await expect(page.locator('#onboardingLayer')).toHaveClass(/completed/);
});
