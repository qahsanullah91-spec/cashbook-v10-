export function withRunningBalance(transactions, openingBalance = 0) {
  let balance = Number(openingBalance || 0);
  return [...transactions]
    .sort((a, b) => new Date(a.date) - new Date(b.date) || a.id - b.id)
    .map((transaction) => {
      balance += transaction.transaction_type === 'cash_in'
        ? Number(transaction.cash_in_afn || 0)
        : -Number(transaction.cash_out_afn || 0);
      return { ...transaction, runningBalance: Math.round(balance * 100) / 100 };
    });
}
