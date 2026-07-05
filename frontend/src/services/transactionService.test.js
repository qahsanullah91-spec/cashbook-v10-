import assert from 'node:assert/strict';
import test from 'node:test';
import { isLegacyUpdateDateError, withoutTransactionDate } from './transactionCompatibility.js';

test('recognizes the legacy transaction update date validation error', () => {
  assert.equal(
    isLegacyUpdateDateError(new Error('Server error (422): Date: Input should be None')),
    true
  );
  assert.equal(isLegacyUpdateDateError(new Error('Server error (422): Detail: Field required')), false);
});

test('removes only the date from a legacy-compatible update payload', () => {
  assert.deepEqual(
    withoutTransactionDate({ date: '2026-06-14', detail: 'Updated', cash_in_afn: 100 }),
    { detail: 'Updated', cash_in_afn: 100 }
  );
});
