export function salaryMonthStart(value = new Date().toISOString().slice(0, 10)) {
  return `${String(value).slice(0, 7)}-01`;
}

function inputDate(date) {
  const value = new Date(date);
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 10);
}

function nextMonth(value) {
  const date = new Date(`${value}T00:00:00`);
  date.setMonth(date.getMonth() + 1);
  return salaryMonthStart(inputDate(date));
}

function previousMonth(value) {
  const date = new Date(`${value}T00:00:00`);
  date.setMonth(date.getMonth() - 1);
  return salaryMonthStart(inputDate(date));
}

function amountFor(employee, transaction) {
  return Number(employee.currency === 'USD' ? transaction.usd_out : transaction.cash_out_afn || 0);
}

function paidThroughMonth(employee, transactions, salaryMonth) {
  return transactions
    .filter((transaction) => (
      Number(transaction.employee_id) === Number(employee.id)
      && transaction.transaction_type === 'cash_out'
      && transaction.category === 'salary'
      && salaryMonthStart(transaction.salary_month || transaction.date) <= salaryMonth
    ))
    .reduce((total, transaction) => total + amountFor(employee, transaction), 0);
}

function earnedThroughMonth(employee, salaryMonth) {
  const monthlySalary = Number(employee.monthly_salary || 0);
  let current = salaryMonthStart(employee.joining_date || salaryMonth);
  let total = 0;
  while (current <= salaryMonth) {
    total += monthlySalary;
    current = nextMonth(current);
  }
  return total;
}

export function employeeSalarySnapshot(employee, transactions = [], month) {
  if (!employee) return null;
  const salaryMonth = salaryMonthStart(month);
  const matching = transactions.filter((transaction) => (
      Number(transaction.employee_id) === Number(employee.id)
      && transaction.transaction_type === 'cash_out'
      && transaction.category === 'salary'
      && salaryMonthStart(transaction.salary_month || transaction.date) === salaryMonth
    ));
  const paidAmount = matching
    .filter((transaction) => (transaction.payroll_kind || 'salary') === 'salary')
    .reduce((total, transaction) => (
      total + Number(employee.currency === 'USD' ? transaction.usd_out : transaction.cash_out_afn || 0)
    ), 0);
  const advanceTaken = matching
    .filter((transaction) => transaction.payroll_kind === 'advance')
    .reduce((total, transaction) => (
      total + amountFor(employee, transaction)
    ), 0);
  const monthlySalary = Number(employee.monthly_salary || 0);
  const previousSalaryMonth = previousMonth(salaryMonth);
  const previousCarryForward = employee.joining_date
    ? Number((earnedThroughMonth(employee, previousSalaryMonth) - paidThroughMonth(employee, transactions, previousSalaryMonth)).toFixed(2))
    : 0;
  const totalPayableSalary = Number((monthlySalary + previousCarryForward).toFixed(2));
  const carryForwardBalance = Number((totalPayableSalary - paidAmount - advanceTaken).toFixed(2));
  return {
    monthly_salary: monthlySalary,
    paid_amount: Number(paidAmount.toFixed(2)),
    advance_taken: Number(advanceTaken.toFixed(2)),
    previous_carry_forward_balance: previousCarryForward,
    total_payable_salary: totalPayableSalary,
    remaining_salary: carryForwardBalance,
    carry_forward_balance: carryForwardBalance,
    currency: employee.currency || 'AFN',
    salary_month: salaryMonth
  };
}
