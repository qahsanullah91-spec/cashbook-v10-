export const CASH_BOOK_PAGE_SIZE = 100;

function inputDate(date) {
  const value = new Date(date);
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 10);
}

function cashDelta(transaction) {
  return transaction.transaction_type === 'cash_in'
    ? Number(transaction.cash_in_afn || 0)
    : -Number(transaction.cash_out_afn || 0);
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export function currentMonthDateRange(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  return {
    startDate: inputDate(new Date(year, month, 1)),
    endDate: inputDate(new Date(year, month + 1, 0))
  };
}

export function monthDateRangeForDate(dateValue) {
  if (!dateValue) return currentMonthDateRange();
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return currentMonthDateRange();
  return currentMonthDateRange(date);
}

export function buildBalanceBroughtForwardRow(openingBalance, startDate) {
  return {
    id: `balance-brought-forward-${startDate || 'all'}`,
    isOpeningBalance: true,
    date: startDate || '',
    transaction_no: 'BF',
    account_name: 'Balance Brought Forward',
    detail: 'Opening balance from previous month closing',
    category: 'opening_balance',
    transaction_type: 'opening_balance',
    payment_method: '',
    cash_in_afn: 0,
    cash_out_afn: 0,
    usd_in: 0,
    usd_out: 0,
    exchange_rate: '',
    note: 'Automatically calculated',
    runningBalance: roundMoney(openingBalance),
    searchText: 'balance brought forward opening balance previous month closing',
    accountSearchText: 'balance brought forward'
  };
}

export function buildCashBookRows(transactions) {
  let runningBalance = 0;
  return [...transactions]
    .sort((left, right) => String(left.date).localeCompare(String(right.date)) || left.id - right.id)
    .map((transaction) => {
      runningBalance += cashDelta(transaction);
      return {
        ...transaction,
        runningBalance: roundMoney(runningBalance),
        searchText: `${transaction.account_name || ''} ${transaction.detail || ''} ${transaction.note || ''}`.toLowerCase(),
        accountSearchText: String(transaction.account_name || '').toLowerCase()
      };
    });
}

export function filterCashBookRows(rows, filters) {
  const monthRange = filters.startDate ? monthDateRangeForDate(filters.startDate) : null;
  const startDate = monthRange?.startDate || filters.startDate;
  const endDate = monthRange?.endDate || filters.endDate;
  const search = filters.search.trim().toLowerCase();
  const account = filters.account.trim().toLowerCase();
  const openingBalance = startDate
    ? rows
      .filter((transaction) => transaction.date < startDate)
      .reduce((balance, transaction) => balance + cashDelta(transaction), 0)
    : 0;
  let runningBalance = roundMoney(openingBalance);

  const filteredRows = rows.filter((transaction) => (
    (!search || transaction.searchText.includes(search))
    && (!startDate || transaction.date >= startDate)
    && (!endDate || transaction.date <= endDate)
    && (filters.type === 'all' || transaction.transaction_type === filters.type)
    && (filters.category === 'all' || transaction.category === filters.category)
    && (filters.payment === 'all' || transaction.payment_method === filters.payment)
    && (!account || transaction.accountSearchText.includes(account))
  )).map((transaction) => {
    runningBalance = roundMoney(runningBalance + cashDelta(transaction));
    return { ...transaction, runningBalance };
  });

  if (!startDate) return filteredRows;
  return [buildBalanceBroughtForwardRow(openingBalance, startDate), ...filteredRows];
}

export function summarizeCashBookRows(rows) {
  return rows.reduce((totals, transaction) => {
    totals.cashIn += Number(transaction.cash_in_afn || 0);
    totals.cashOut += Number(transaction.cash_out_afn || 0);
    totals.usdIn += Number(transaction.usd_in || 0);
    totals.usdOut += Number(transaction.usd_out || 0);
    return totals;
  }, { cashIn: 0, cashOut: 0, usdIn: 0, usdOut: 0 });
}
