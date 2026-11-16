import test from 'node:test';
import assert from 'node:assert/strict';
import {amountInRubles,defaultAmountCurrency} from '../src/amount-currency.js';
import {domesticQuote} from '../src/authorized-transfer.js';
test('User demo rates convert dollars and euros to rubles with kopeck rounding',()=>{
 assert.equal(amountInRubles(100,'USD'),8270);
 assert.equal(amountInRubles(100,'EUR'),9098);
 assert.equal(amountInRubles(1.23,'USD'),101.72);
 assert.equal(amountInRubles(1.23,'EUR'),111.91);
 assert.equal(amountInRubles(100.01,'RUB'),100.01);
 assert.equal(amountInRubles(Infinity,'USD'),null);
 assert.equal(amountInRubles(10,'INVALID'),null);
});
test('Commission and insufficient funds use the ruble equivalent',()=>{
 assert.deepEqual(domesticQuote(amountInRubles(100,'USD'),12500),{fee:124.05,total:8394.05,insufficient:false});
 assert.deepEqual(domesticQuote(amountInRubles(100,'EUR'),9000),{fee:136.47,total:9234.47,insufficient:true});
});
test('Russian cards default to rubles, including a Russian bank with a USD account',()=>{
 assert.equal(defaultAmountCurrency({id:'debit'}),'RUB');
 assert.equal(defaultAmountCurrency({country:'RU',currency:'USD'}),'RUB');
 assert.equal(defaultAmountCurrency({bankInfo:{country:'RU'},currency:'EUR'}),'RUB');
 assert.equal(defaultAmountCurrency({currency:'RUB',external:true}),'RUB');
 assert.equal(defaultAmountCurrency({currency:'USD'}),'USD');
});
