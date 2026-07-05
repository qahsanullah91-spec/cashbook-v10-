import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPrintReport, reportDateRange, waitForCondition, waitForPrintReady, withTimeout } from './printEngine.js';

const baseContext = {
  activeView: 'dashboard',
  company: { companyName: 'Test Company' },
  preparedBy: 'Administrator',
  summary: { cash_in_afn: 100, cash_out_afn: 40, afn_balance: 60 },
  latestTransactions: [{ id: 1, detail: 'Latest row' }],
  cashRows: [{ id: 2, detail: 'Cash book row' }],
  cashTotals: { cashIn: 100, cashOut: 40, usdIn: 2, usdOut: 1 },
  ledger: {
    rows: [{ id: 3, detail: 'Ledger row' }],
    opening_balance_afn: 10,
    total_cash_in_afn: 80,
    total_cash_out_afn: 30,
    final_balance_afn: 60
  },
  selectedAccount: { id: 7, name: 'Ledger Account' },
  reportMode: 'monthly',
  reportData: {
    summary: { cash_in_afn: 90, cash_out_afn: 20, afn_balance: 70 },
    transactions: [{ id: 4, detail: 'Generated report row' }]
  }
};

test('buildPrintReport selects full filtered rows for the cash book', () => {
  const report = buildPrintReport({ ...baseContext, activeView: 'cashbook' });

  assert.equal(report.kind, 'cashbook');
  assert.equal(report.title, 'Cash Book / Records');
  assert.deepEqual(report.rows, baseContext.cashRows);
  assert.equal(report.summary.cash_in_afn, 100);
  assert.equal(report.dateDisplayFormat, 'dual');
});

for (const rowCount of [0, 5, 50, 200]) {
  test(`buildPrintReport preserves all ${rowCount} cash book rows for printing`, () => {
    const cashRows = Array.from({ length: rowCount }, (_, index) => ({
      id: index + 1,
      detail: `Cash book row ${index + 1}`
    }));
    const report = buildPrintReport({ ...baseContext, activeView: 'cashbook', cashRows });

    assert.equal(report.rows.length, rowCount);
  });
}

test('buildPrintReport selects the active account ledger and its balances', () => {
  const report = buildPrintReport({ ...baseContext, activeView: 'ledger' });

  assert.equal(report.kind, 'ledger');
  assert.equal(report.title, 'Ledger Account - Account Ledger');
  assert.deepEqual(report.rows, baseContext.ledger.rows);
  assert.equal(report.summary.opening_balance_afn, 10);
  assert.equal(report.summary.final_balance_afn, 60);
});

test('buildPrintReport selects generated report rows and rejects missing report data', () => {
  const report = buildPrintReport({ ...baseContext, activeView: 'reports' });

  assert.equal(report.kind, 'report');
  assert.equal(report.title, 'Monthly Report');
  assert.deepEqual(report.rows, baseContext.reportData.transactions);

  assert.throws(
    () => buildPrintReport({ ...baseContext, activeView: 'reports', reportData: null }),
    /Run the report before opening print preview/
  );
});

test('waitForPrintReady resolves after fonts, images, and two paint frames', async () => {
  const calls = [];
  const root = {
    querySelectorAll: () => [
      { complete: true },
      { complete: false, addEventListener: (name, handler) => name === 'load' && queueMicrotask(handler) }
    ]
  };
  const documentRef = { fonts: { ready: Promise.resolve().then(() => calls.push('fonts')) } };
  const requestFrame = (callback) => {
    calls.push('frame');
    callback();
  };

  await waitForPrintReady({ root, documentRef, requestFrame, timeoutMs: 100 });

  assert.deepEqual(calls, ['fonts', 'frame', 'frame']);
});

test('waitForPrintReady has a bounded timeout for images that never finish', async () => {
  const root = {
    querySelectorAll: () => [
      { complete: false, addEventListener() {} }
    ]
  };

  const startedAt = Date.now();
  await waitForPrintReady({
    root,
    documentRef: { fonts: { ready: Promise.resolve() } },
    requestFrame: (callback) => callback(),
    timeoutMs: 20
  });

  assert.ok(Date.now() - startedAt < 200);
});

test('waitForCondition resolves when data becomes ready and rejects on timeout', async () => {
  let ready = false;
  queueMicrotask(() => {
    ready = true;
  });

  await waitForCondition(() => ready, { timeoutMs: 100, intervalMs: 1 });

  await assert.rejects(
    waitForCondition(() => false, { timeoutMs: 20, intervalMs: 1 }),
    /Timed out waiting for report data/
  );
});

test('reportDateRange returns stable local daily and monthly ranges', () => {
  const now = new Date('2026-06-13T12:00:00');

  assert.deepEqual(reportDateRange('daily', now), {
    start: '2026-06-13',
    end: '2026-06-13'
  });
  assert.deepEqual(reportDateRange('monthly', now), {
    start: '2026-06-01',
    end: '2026-06-13'
  });
});

test('withTimeout rejects stalled preview data requests', async () => {
  await assert.rejects(
    withTimeout(new Promise(() => {}), 20, 'Preview data timed out.'),
    /Preview data timed out/
  );

  assert.equal(await withTimeout(Promise.resolve('ready'), 100), 'ready');
});
