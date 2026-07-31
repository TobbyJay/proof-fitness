import { expect } from '@playwright/test';

export async function waitForBootstrap(page) {
  await page.goto('/');
  await expect(page.locator('#persistenceLoading')).toBeHidden();
}

export async function completeOnboarding(page, { name = 'Audit User', guidance = 'chimes' } = {}) {
  await waitForBootstrap(page);
  await expect(page.locator('#onboardingLayer')).toBeVisible();
  await page.locator('#obName').fill(name);
  await page.locator('#obWeight').fill('74.5');
  await page.locator('#obWaist').fill('81.2');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Choose three days you can defend.' })).toBeVisible();
  await page.getByRole('button', { name: /Friday/ }).click();
  await page.getByRole('button', { name: /Tuesday/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Make every load unambiguous.' })).toBeVisible();
  await page.getByRole('button', { name: /Not owned/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Choose your coaching defaults.' })).toBeVisible();
  await page.getByRole('button', { name: new RegExp(guidance, 'i') }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: /Begin Week 1/ })).toBeVisible();
  await page.getByRole('button', { name: 'Begin Week 1' }).click();
  await expect(page.locator('#onboardingLayer')).toHaveClass(/completed/);
  await expect(page.locator('#todayWorkoutName')).toHaveText('Full Body A');
}

export async function readStore(page, storeName) {
  return page.evaluate(async name => {
    const request = indexedDB.open('proof-fitness');
    const db = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const transaction = db.transaction(name, 'readonly');
      const storeRequest = transaction.objectStore(name).getAll();
      return await new Promise((resolve, reject) => {
        storeRequest.onsuccess = () => resolve(storeRequest.result);
        storeRequest.onerror = () => reject(storeRequest.error);
      });
    } finally {
      db.close();
    }
  }, storeName);
}

export async function storeCounts(page) {
  const stores = [
    'workoutSessions', 'runSessions', 'mealChecks', 'dailyCheckIns',
    'measurements', 'exerciseProgressionStates', 'programmeReviews'
  ];
  return Object.fromEntries(await Promise.all(stores.map(async name => [name, (await readStore(page, name)).length])));
}

export async function putRecords(page, storeName, records) {
  await page.evaluate(async ({ name, values }) => {
    const request=indexedDB.open('proof-fitness');
    const db=await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    try {
      const transaction=db.transaction(name,'readwrite');
      for(const record of values) transaction.objectStore(name).put(record);
      await new Promise((resolve,reject)=>{transaction.oncomplete=resolve;transaction.onerror=transaction.onabort=()=>reject(transaction.error);});
    } finally { db.close(); }
  }, { name:storeName,values:records });
}

export async function installSinglePutFailure(page, storeName) {
  await page.evaluate(name => {
    const original = IDBObjectStore.prototype.put;
    let failed = false;
    IDBObjectStore.prototype.put = function (...args) {
      if (!failed && this.name === name) {
        failed = true;
        throw new DOMException(`Audit-injected ${name} write failure`, 'QuotaExceededError');
      }
      return original.apply(this, args);
    };
    window.__restoreAuditPut = () => { IDBObjectStore.prototype.put = original; };
  }, storeName);
}

export async function restorePut(page) {
  await page.evaluate(() => window.__restoreAuditPut?.());
}

export async function clearSiteData(page) {
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await Promise.all((await caches.keys()).map(key => caches.delete(key)));
    await new Promise(resolve => {
      const request = indexedDB.deleteDatabase('proof-fitness');
      request.onsuccess = request.onerror = request.onblocked = () => resolve();
    });
  });
}
