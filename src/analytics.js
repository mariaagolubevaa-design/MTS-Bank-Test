import {demoAmountRates} from './amount-currency.js';

// November demo opening totals already include the seeded history rows.
export const analyticsDemoPeriod='2026-11';
const openingTotals={debit:{expenses:46831,income:52500},second:{expenses:732,income:1500}};
const seedIds=new Set(['t1','t2','t3','t4']);
export function analyticsFor(data,cardId,now=new Date()) {
  const card=data.cards.find(c=>c.id===cardId);
  const currency=card?.currency||'RUB';
  const period=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const initial=period===analyticsDemoPeriod&&openingTotals[cardId]?openingTotals[cardId]:{expenses:0,income:0};
  let expenses=Math.round(initial.expenses*100),income=Math.round(initial.income*100);
  for(const operation of data.transactions) {
    if(operation.cardId!==cardId||seedIds.has(operation.id)||operation.status&&operation.status!=='Выполнен')continue;
    const date=operation.createdAt?new Date(operation.createdAt):null;
    const operationPeriod=date&&Number.isFinite(date.getTime())?`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`:analyticsDemoPeriod;
    if(operationPeriod!==period||!Number.isFinite(operation.amount))continue;
    const fromRate=demoAmountRates[operation.currency||'RUB'];
    const toRate=demoAmountRates[currency];
    if(!fromRate||!toRate)continue;
    const fee=operation.amount<0&&Number.isFinite(operation.fee)?operation.fee:0;
    const kopecks=Math.round((Math.abs(operation.amount)+fee)*fromRate/toRate*100);
    if(operation.amount<0)expenses+=kopecks;
    else income+=kopecks;
  }
  return {expenses:expenses/100,income:income/100,currency,empty:expenses===0&&income===0,month:['январе','феврале','марте','апреле','мае','июне','июле','августе','сентябре','октябре','ноябре','декабре'][now.getMonth()]};
}
