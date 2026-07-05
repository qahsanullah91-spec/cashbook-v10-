import test from 'node:test';
import assert from 'node:assert/strict';
import { compactTransactionNo, dateLabel, jalaliDateLabel } from './format.js';

test('dateLabel renders accounting dates on one compact line', () => {
  assert.equal(dateLabel('2026-04-21'), 'Apr 21, 2026');
});

test('jalaliDateLabel converts stored Gregorian dates to stable Jalali dates', () => {
  assert.equal(jalaliDateLabel('2026-04-21'), '1405/02/01');
  assert.equal(jalaliDateLabel('2026-04-22'), '1405/02/02');
  assert.equal(jalaliDateLabel(''), '');
});

test('compactTransactionNo shortens generated TX numbers without changing other values', () => {
  assert.equal(compactTransactionNo('TX-20260421-0001'), 'TX-260421-0001');
  assert.equal(compactTransactionNo('MANUAL-42'), 'MANUAL-42');
  assert.equal(compactTransactionNo(''), '');
});
