import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { employeeSalarySnapshot } from './payroll.js';

const app = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');
const form = readFileSync(new URL('../components/TransactionForm.jsx', import.meta.url), 'utf8');
const salaryPage = readFileSync(new URL('../pages/EmployeesSalary.jsx', import.meta.url), 'utf8');
const api = readFileSync(new URL('../services/api.js', import.meta.url), 'utf8');

test('employee salary data is linked to Cash Out and remaining salary UI', () => {
  assert.match(api, /getEmployees/);
  assert.match(api, /createEmployee/);
  assert.match(app, /employee_id:\s*form\.employee_id/);
  assert.match(app, /salary_month:\s*form\.salary_month/);
  assert.match(form, /Monthly Salary/);
  assert.match(form, /Remaining Salary/);
  assert.match(salaryPage, /Add Employee/);
  assert.match(salaryPage, /remaining_salary/);
});

test('salary payment modal caps payment amount at remaining salary', () => {
  assert.match(salaryPage, /const payableLimit = Math\.max\(0, currentCarryForward\)/);
  assert.match(salaryPage, /max=\{payableLimit\}/);
  assert.match(salaryPage, /amount > payableLimit/);
  assert.match(salaryPage, /Amount cannot be more than remaining salary\./);
});

test('30,000 AFN salary minus 10,000 AFN Cash Out leaves 20,000 AFN', () => {
  const snapshot = employeeSalarySnapshot(
    { id: 7, monthly_salary: 30000, currency: 'AFN' },
    [{
      employee_id: 7,
      transaction_type: 'cash_out',
      category: 'salary',
      payroll_kind: 'salary',
      salary_month: '2026-06-01',
      cash_out_afn: 10000,
      usd_out: 0
    }],
    '2026-06-01'
  );

  assert.equal(snapshot.monthly_salary, 30000);
  assert.equal(snapshot.paid_amount, 10000);
  assert.equal(snapshot.remaining_salary, 20000);
});

test('salary advances are tracked separately and reduce remaining salary', () => {
  const snapshot = employeeSalarySnapshot(
    { id: 7, monthly_salary: 50000, currency: 'AFN' },
    [
      { employee_id: 7, transaction_type: 'cash_out', category: 'salary', payroll_kind: 'salary', salary_month: '2026-06-01', cash_out_afn: 20000 },
      { employee_id: 7, transaction_type: 'cash_out', category: 'salary', payroll_kind: 'advance', salary_month: '2026-06-01', cash_out_afn: 5000 }
    ],
    '2026-06-01'
  );

  assert.equal(snapshot.paid_amount, 20000);
  assert.equal(snapshot.advance_taken, 5000);
  assert.equal(snapshot.remaining_salary, 25000);
});

test('salary overpayment carries negative balance into the next month', () => {
  const julySnapshot = employeeSalarySnapshot(
    { id: 7, monthly_salary: 12000, currency: 'AFN', joining_date: '2026-06-01' },
    [
      { employee_id: 7, transaction_type: 'cash_out', category: 'salary', payroll_kind: 'salary', salary_month: '2026-06-01', cash_out_afn: 15000 }
    ],
    '2026-07-01'
  );

  assert.equal(julySnapshot.previous_carry_forward_balance, -3000);
  assert.equal(julySnapshot.total_payable_salary, 9000);
  assert.equal(julySnapshot.remaining_salary, 9000);
});
