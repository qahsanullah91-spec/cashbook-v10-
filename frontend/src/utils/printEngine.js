const REPORT_TITLES = {
  daily: 'Daily Report',
  monthly: 'Monthly Report',
  dateRange: 'Date Range Report',
  expenses: 'Expense Report'
};

function localDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function reportDateRange(mode, now = new Date()) {
  const end = localDateValue(now);
  if (mode === 'monthly') {
    return {
      start: localDateValue(new Date(now.getFullYear(), now.getMonth(), 1)),
      end
    };
  }
  return { start: end, end };
}

function requireValue(value, message) {
  if (!value) throw new Error(message);
  return value;
}

export function buildPrintReport(context) {
  const common = {
    company: context.company,
    preparedBy: context.preparedBy,
    dateDisplayFormat: context.dateDisplayFormat || 'dual',
    generatedAt: new Date().toISOString()
  };

  if (context.activeView === 'cashbook') {
    return {
      ...common,
      kind: 'cashbook',
      title: 'Cash Book / Records',
      summary: {
        cash_in_afn: context.cashTotals.cashIn,
        cash_out_afn: context.cashTotals.cashOut,
        usd_in: context.cashTotals.usdIn,
        usd_out: context.cashTotals.usdOut
      },
      rows: context.cashRows || []
    };
  }

  if (context.activeView === 'ledger') {
    const account = requireValue(context.selectedAccount, 'Select an account before opening print preview.');
    const ledger = requireValue(context.ledger, 'The selected ledger is still loading.');
    return {
      ...common,
      kind: 'ledger',
      title: `${account.name} - Account Ledger`,
      account,
      summary: {
        opening_balance_afn: ledger.opening_balance_afn,
        total_cash_in_afn: ledger.total_cash_in_afn,
        total_cash_out_afn: ledger.total_cash_out_afn,
        final_balance_afn: ledger.final_balance_afn
      },
      rows: ledger.rows || []
    };
  }

  if (context.activeView === 'reports') {
    const data = requireValue(context.reportData, 'Run the report before opening print preview.');
    return {
      ...common,
      kind: 'report',
      mode: context.reportMode,
      title: REPORT_TITLES[context.reportMode] || 'Financial Report',
      summary: data.summary || data,
      rows: data.transactions || []
    };
  }

  return {
    ...common,
    kind: 'dashboard',
    title: 'Cash Management Dashboard Report',
    summary: context.summary || {},
    rows: context.latestTransactions || []
  };
}

export function waitForCondition(predicate, { timeoutMs = 5000, intervalMs = 25 } = {}) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const check = () => {
      if (predicate()) {
        resolve();
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error('Timed out waiting for report data.'));
        return;
      }
      setTimeout(check, intervalMs);
    };

    check();
  });
}

export function withTimeout(promise, timeoutMs, message = 'The operation timed out.') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function waitForImage(image) {
  if (image.complete) return Promise.resolve();
  return new Promise((resolve) => {
    image.addEventListener('load', resolve, { once: true });
    image.addEventListener('error', resolve, { once: true });
  });
}

function nextFrame(requestFrame) {
  return new Promise((resolve) => requestFrame(resolve));
}

export async function waitForPrintReady({
  root,
  documentRef = document,
  requestFrame = requestAnimationFrame,
  timeoutMs = 3000
}) {
  const images = root ? Array.from(root.querySelectorAll('img')) : [];
  const readiness = Promise.all([
    documentRef.fonts?.ready || Promise.resolve(),
    ...images.map(waitForImage)
  ]);
  const timeout = new Promise((resolve) => setTimeout(resolve, timeoutMs));

  await Promise.race([readiness, timeout]);
  await nextFrame(requestFrame);
  await nextFrame(requestFrame);
}
