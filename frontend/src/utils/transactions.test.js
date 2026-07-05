import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCashBookRows, currentMonthDateRange, filterCashBookRows, summarizeCashBookRows } from './transactions.js';

const rows = [
  { id: 2, date: '2026-04-22', transaction_type: 'cash_out', cash_out_afn: 40, account_name: 'Factory', detail: 'Rent', note: '', category: 'rent', payment_method: 'cash' },
  { id: 1, date: '2026-04-21', transaction_type: 'cash_in', cash_in_afn: 100, usd_in: 2, account_name: 'Client', detail: 'Invoice', note: 'April', category: 'other', payment_method: 'bank' }
];

test('buildCashBookRows sorts once and calculates stable running balances', () => {
  const result = buildCashBookRows(rows);
  assert.deepEqual(result.map((row) => row.id), [1, 2]);
  assert.deepEqual(result.map((row) => row.runningBalance), [100, 60]);
});

test('filterCashBookRows applies deferred search and structured filters', () => {
  const result = filterCashBookRows(buildCashBookRows(rows), {
    search: 'invoice',
    account: '',
    startDate: '',
    endDate: '',
    type: 'all',
    category: 'all',
    payment: 'all'
  });
  assert.deepEqual(result.map((row) => row.id), [1]);
});

test('summarizeCashBookRows totals the full filtered set, not one page', () => {
  assert.deepEqual(summarizeCashBookRows(buildCashBookRows(rows)), {
    cashIn: 100,
    cashOut: 40,
    usdIn: 2,
    usdOut: 0
  });
});

test('cash book derivation remains fast with 5,000 records', () => {
  const largeSet = Array.from({ length: 5000 }, (_, index) => ({
    ...rows[index % rows.length],
    id: index + 1,
    account_name: `Account ${index % 100}`,
    detail: `Transaction detail ${index}`
  }));
  const startedAt = performance.now();
  const built = buildCashBookRows(largeSet);
  const filtered = filterCashBookRows(built, {
    search: 'detail 49',
    account: '',
    startDate: '',
    endDate: '',
    type: 'all',
    category: 'all',
    payment: 'all'
  });
  summarizeCashBookRows(filtered);
  assert.ok(performance.now() - startedAt < 1000);
});

test('currentMonthDateRange returns the first and last day of the active month', () => {
  assert.deepEqual(currentMonthDateRange(new Date('2026-07-02T08:00:00')), {
    startDate: '2026-07-01',
    endDate: '2026-07-31'
  });
});

test('filterCashBookRows isolates month and injects balance brought forward', () => {
  const monthlyRows = [
    { id: 1, date: '2026-06-05', transaction_type: 'cash_in', cash_in_afn: 100000, account_name: 'June Client', detail: 'June income', note: '', category: 'other', payment_method: 'cash' },
    { id: 2, date: '2026-06-07', transaction_type: 'cash_out', cash_out_afn: 5000, account_name: 'June Expense', detail: 'June expense', note: '', category: 'other', payment_method: 'cash' },
    { id: 3, date: '2026-07-01', transaction_type: 'cash_out', cash_out_afn: 2000, account_name: 'July Rent', detail: 'July rent', note: '', category: 'rent', payment_method: 'cash' },
    { id: 4, date: '2026-07-02', transaction_type: 'cash_in', cash_in_afn: 7000, account_name: 'July Client', detail: 'July income', note: '', category: 'other', payment_method: 'bank' },
    { id: 5, date: '2026-08-01', transaction_type: 'cash_in', cash_in_afn: 500, account_name: 'August Client', detail: 'August income', note: '', category: 'other', payment_method: 'cash' }
  ];

  const result = filterCashBookRows(buildCashBookRows(monthlyRows), {
    search: '',
    account: '',
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    type: 'all',
    category: 'all',
    payment: 'all'
  });

  assert.equal(result[0].isOpeningBalance, true);
  assert.equal(result[0].runningBalance, 95000);
  assert.deepEqual(result.map((row) => row.id), ['balance-brought-forward-2026-07-01', 3, 4]);
  assert.deepEqual(result.map((row) => row.runningBalance), [95000, 93000, 100000]);
  assert.ok(result.every((row) => row.isOpeningBalance || row.date.startsWith('2026-07')));
});

test('filterCashBookRows clamps cross-month date ranges to the From date month', () => {
  const result = filterCashBookRows(buildCashBookRows([
    { id: 1, date: '2026-06-30', transaction_type: 'cash_in', cash_in_afn: 100, account_name: 'June', detail: 'June', note: '', category: 'other', payment_method: 'cash' },
    { id: 2, date: '2026-07-10', transaction_type: 'cash_in', cash_in_afn: 50, account_name: 'July', detail: 'July', note: '', category: 'other', payment_method: 'cash' },
    { id: 3, date: '2026-08-01', transaction_type: 'cash_in', cash_in_afn: 500, account_name: 'August', detail: 'August', note: '', category: 'other', payment_method: 'cash' }
  ]), {
    search: '',
    account: '',
    startDate: '2026-07-15',
    endDate: '2026-08-15',
    type: 'all',
    category: 'all',
    payment: 'all'
  });

  assert.deepEqual(result.map((row) => row.id), ['balance-brought-forward-2026-07-01', 2]);
  assert.deepEqual(result.map((row) => row.runningBalance), [100, 150]);
});
