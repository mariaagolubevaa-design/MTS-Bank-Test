import test from 'node:test';
import assert from 'node:assert/strict';
import { demoData, money, operationsFor } from '../src/data.js';

test('Ruble formatting handles fractions and large amounts', () => {
  assert.equal(money(12500).replaceAll('\u00a0', ' '), '12 500 ₽');
  assert.equal(money(-87450.25).replaceAll('\u00a0', ' '), '87 450,25 ₽');
  assert.equal(money(123456789.99).replaceAll('\u00a0', ' '), '123 456 789,99 ₽');
});
test('Each card displays its own operations', () => {
  assert.equal(operationsFor(demoData, 'debit').length, 3);
  assert.equal(operationsFor(demoData, 'second').length, 2);
  assert.deepEqual(operationsFor(demoData, 'missing'), []);
});

test('Ruble opening history matches Figma and new operations stay on their card', () => {
  const original=operationsFor(demoData,'debit');
  assert.deepEqual(original.map(t=>[t.name,t.amount,t.currency,t.date]),[
    ['Татьяна Ш.',-5000,'RUB','Сегодня, 14:32'],
    ['Павел Г.',-2500,'RUB','Вчера, 19:08'],
    ['Татьяна Ш.',-3000,'RUB','30 октября'],
  ]);
  const data={transactions:[{id:'sent-rub',cardId:'debit',amount:-100,currency:'RUB'},{id:'topup-usd',cardId:'second',amount:50,currency:'USD'},...demoData.transactions]};
  assert.equal(operationsFor(data,'debit')[0].id,'sent-rub');
  assert.ok(operationsFor(data,'debit').every(t=>t.currency==='RUB'));
  assert.equal(operationsFor(data,'second')[0].id,'topup-usd');
});

test('Dollar opening history matches Figma', () => {
  assert.deepEqual(operationsFor(demoData,'second').map(t=>[t.name,t.amount,t.currency,t.date]),[
    ['Марина Б.',-150,'USD','Сегодня, 10:34'],
    ['Павел Г.',500,'USD','28 октября'],
  ]);
});
