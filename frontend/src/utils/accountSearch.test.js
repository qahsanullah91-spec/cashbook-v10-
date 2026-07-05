import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAccountSearchIndex, searchAccountIndex } from './accountSearch.js';

test('groups matching employees, companies, and accounts while prioritizing prefix matches', () => {
  const index = buildAccountSearchIndex({
    employees: [
      { id: 1, account_id: 11, full_name: 'Ahmad Khan', position: 'Manager' },
      { id: 2, account_id: 12, full_name: 'Wali Ahmad', position: 'Operator' }
    ],
    accounts: [
      { id: 20, name: 'Ahmad Trading Company', account_type: 'supplier' },
      { id: 21, name: 'Ahmad Personal Account', account_type: 'customer' }
    ]
  });

  const groups = searchAccountIndex(index, 'ah', 8);

  assert.deepEqual(groups.map((group) => group.label), ['Employees', 'Companies', 'Accounts']);
  assert.equal(groups[0].items[0].name, 'Ahmad Khan');
  assert.equal(groups[1].items[0].name, 'Ahmad Trading Company');
  assert.equal(groups[2].items[0].name, 'Ahmad Personal Account');
});

test('search remains bounded for 10,000 employees', () => {
  const employees = Array.from({ length: 10000 }, (_, index) => ({
    id: index + 1,
    account_id: index + 100,
    full_name: `Employee ${String(index).padStart(5, '0')}`,
    position: 'Operator'
  }));
  const index = buildAccountSearchIndex({ employees, accounts: [] });
  const startedAt = performance.now();
  const groups = searchAccountIndex(index, 'Employee 099', 8);

  assert.ok(performance.now() - startedAt < 100);
  assert.ok(groups.flatMap((group) => group.items).length <= 8);
});
