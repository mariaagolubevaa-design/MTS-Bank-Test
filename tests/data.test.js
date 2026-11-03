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
  assert.equal(operationsFor(demoData, 'second').length, 1);
  assert.deepEqual(operationsFor(demoData, 'missing'), []);
});
