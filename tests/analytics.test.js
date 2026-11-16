import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyticsFor} from '../src/analytics.js';
const now=new Date(2026,10,17);
const data=()=>({cards:[{id:'debit'},{id:'second',currency:'USD'},{id:'added',currency:'RUB'}],transactions:[]});
test('Figma opening totals, account currency, empty added cards and monthly reset',()=>{
 const d=data();assert.equal(analyticsFor(d,'debit',now).expenses,46831);assert.equal(analyticsFor(d,'second',now).currency,'USD');assert.equal(analyticsFor(d,'second',now).income,52500);assert.ok(analyticsFor(d,'added',now).empty);assert.ok(analyticsFor(d,'debit',new Date(2026,11,1)).empty);
});
test('Transfers include fees, topups add income, seed history is not counted twice',()=>{
 const d=data();d.transactions=[{id:'t1',cardId:'debit',amount:-150,currency:'USD'},{id:'sent-1',cardId:'debit',amount:-5000,fee:75,createdAt:'2026-11-17T10:00:00Z'},{id:'topup-1',cardId:'debit',amount:7800,createdAt:'2026-11-17T09:00:00Z'},{id:'sent-old',cardId:'debit',amount:-10,createdAt:'2026-10-31T09:00:00Z'},{id:'sent-failed',cardId:'debit',amount:-500,status:'Отклонён'}];const a=analyticsFor(d,'debit',now);assert.equal(a.expenses,51906);assert.equal(a.income,60300);assert.equal(analyticsFor(d,'second',now).expenses,46831);
});
test('Dollar account keeps dollars and converts legacy ruble operations once',()=>{
 const d=data();d.transactions=[{id:'sent-usd',cardId:'second',amount:-500,fee:7.5,currency:'USD'},{id:'topup-usd',cardId:'second',amount:120,currency:'USD'},{id:'legacy-rub',cardId:'second',amount:-827,currency:'RUB'}];const a=analyticsFor(d,'second',now);assert.equal(a.expenses,47348.5);assert.equal(a.income,52620);
});
