export async function fillCardDetails(page, selector) {
 const row=page.locator(selector);
 await row.locator('[data-expiry]').click();
 const picker=row.locator('.expiry-picker');
 await picker.getByRole('listbox',{name:'Месяц',exact:true}).focus();await page.keyboard.press('End');
 await picker.getByRole('listbox',{name:'Год',exact:true}).focus();await page.keyboard.press('Home');
 for(let i=0;i<2030-new Date().getFullYear();i++)await page.keyboard.press('ArrowDown');
 await picker.locator('.expiry-confirm').click();
 await row.locator('[data-cvc]').fill('123');
}
