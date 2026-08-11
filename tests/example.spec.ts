import { test, expect } from '@playwright/test';

import loginlogoutusers from './only-login-logout-users.json' assert { type: 'json' };
import premiumupgradeusers from './upgrade-to-premium.json' assert { type: 'json' };
import premiumviewreco from './premium-viewing-recommendation.json' assert { type: 'json' };
import premiumrecopurchase from './premium-recommendation-purchase.json' assert { type: 'json' };

loginlogoutusers.forEach((loginlogoutusers, index) => {
  test(`login-logout-users ${index + 1}`, async ({ page }) => {

    await page.waitForTimeout(1000);
    await page.goto('http://localhost:5000/');
    await page.getByTestId('button-get-started').click();
    await page.getByTestId('input-email').click();
    await page.getByTestId('input-email').fill(loginlogoutusers.email);
    await page.getByTestId('input-password').click();
    await page.getByTestId('input-password').click();
    await page.getByTestId('input-password').fill(loginlogoutusers.password);
    await page.getByTestId('button-login').click();
    await page.waitForTimeout(5000);
    await page.getByTestId('button-logout').click();

  });
});


premiumupgradeusers.forEach((premiumupgradeusers, index) => {

  test(`upgrade-to-premium ${index + 1}`, async ({ page }) => {


    await page.waitForTimeout(1000);
    await page.goto('http://localhost:5000/');
    await page.getByTestId('button-get-started').click();
    await page.getByTestId('input-email').click();
    await page.getByTestId('input-email').fill(premiumupgradeusers.email);
    await page.getByTestId('input-password').fill(premiumupgradeusers.password);
    await page.getByTestId('button-login').click();
    await page.getByTestId('button-upgrade').click();
    await page.getByTestId('button-logout').click();
    await page.waitForTimeout(5000);
  });
});

premiumviewreco.forEach((premiumviewreco, index) => {

  test(`premium-viewing-recommendation ${index + 1}`, async ({ page }) => {

    await page.waitForTimeout(1000);
    await page.goto('http://localhost:5000/');
    await page.getByTestId('button-get-started').click();
    await page.getByTestId('input-email').fill(premiumviewreco.email);
    await page.getByTestId('input-password').fill(premiumviewreco.password);
    await page.getByTestId('button-login').click();
    await page.getByTestId('button-wellness-recommendations').click();
    await page.getByRole('heading', { name: 'Optimize Heart Rate' }).click();
    await page.getByTestId('button-close-recommendations').click();
    await page.getByTestId('button-logout').click();
  });


});


premiumrecopurchase.forEach((premiumrecopurchase, index) => {


  test(`premium-purchase ${index + 1}`, async ({ page }) => {

    await page.goto('http://localhost:5000/');
    await page.getByTestId('button-get-started').click();
    await page.getByTestId('input-email').click();
    await page.getByTestId('input-email').fill(premiumrecopurchase.email);
    await page.getByTestId('input-password').click();
    await page.getByTestId('input-password').fill(premiumrecopurchase.password);
    await page.getByTestId('button-login').click();
    await page.getByTestId('button-wellness-recommendations').click();
    await page.getByRole('heading', { name: 'Optimize Heart Rate' }).click();
    await page.getByTestId('button-upgrade-professional').click();
    await page.getByTestId('button-confirm-purchase').click();


  });

});
