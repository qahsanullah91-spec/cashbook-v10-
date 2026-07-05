# Employees and Salary System Design

## Summary

Add a complete Employees & Salary module to the protected React/Vite and
FastAPI application. The module manages employee profiles, monthly payroll,
salary payments, advances, reports, printing, exports, and backup data while
remaining consistent with the existing Cash Book.

The accounting source of truth is a normalized monthly payroll ledger. Salary
balances are derived from monthly payroll periods and linked payment records;
they are not maintained as a mutable balance on the employee row.

## Confirmed Product Rules

- A Cash Out entry linked to an employee must be classified as:
  - Salary Payment
  - Salary Advance
  - Other / Non-salary
- Salary payments and advances must target an explicitly selected salary month.
- A cross-currency payment uses the Cash Book exchange rate.
- Multiple partial payments for the same employee and month are valid.
- Overpayment or a duplicate completed settlement requires explicit user
  confirmation.
- Other / Non-salary employee Cash Out entries do not change payroll.
- Payroll and its linked Cash Book transaction must be created, updated, or
  deleted atomically.

## Scope

### Included

- Employee CRUD, search, status management, photo, and payroll history
- Monthly salary periods and calculated balances
- Salary payments, bonuses, deductions, and advances
- Employee-aware Cash Out entry
- Payroll dashboard, records, reports, charts, and filters
- Salary slips and monthly payroll reports for A4 printing
- CSV, JSON, Excel, PDF, and browser print output
- Salary data in full backup and restore
- Desktop table and responsive mobile card layouts
- Backend and frontend validation

### Not Included

- Attendance, leave, overtime, tax, benefits, or biometric systems
- Bank API transfers
- Multi-company payroll
- Automatic recurring payment execution
- General accounting journal functionality beyond existing Cash Book behavior

These can be added later without changing the payroll ledger model.

## Architecture

The feature is divided into four bounded areas:

1. Employee directory
2. Monthly payroll ledger
3. Payroll/Cash Book integration service
4. Reporting, printing, and export

Frontend pages communicate through payroll-specific API functions. The backend
owns all calculations and cross-module consistency rules. The frontend may show
live previews, but persisted totals always come from backend responses.

The existing transaction CRUD helpers currently commit independently. Linked
payroll operations will use service functions that flush intermediate rows and
commit once after both the Cash Book and payroll records are valid. Any failure
rolls back the whole operation.

## Data Model

### Employee

Table: `employees`

| Field | Type | Rule |
| --- | --- | --- |
| id | integer | Primary key |
| employee_code | string | Required, unique, user-visible Employee ID |
| account_id | integer | Required unique link to Cash Book account |
| full_name | string | Required |
| father_name | string | Optional |
| phone | string | Optional |
| email | string | Optional |
| position | string | Required |
| department | string | Optional |
| joining_date | date | Required |
| monthly_salary | decimal | Required, non-negative |
| currency | enum | AFN or USD |
| salary_payment_day | integer | Optional, 1 through 31 |
| status | enum | active or inactive |
| address | text | Optional |
| notes | text | Optional |
| photo | text | Optional stored image path or data URL following current app conventions |
| created_at | datetime | Server generated |
| updated_at | datetime | Server generated |

Employee names may change, so integrations use `employee.id` and `account_id`,
not text matching. Creating an employee creates or links one Cash Book account.
Employee account names remain synchronized when the employee name changes.

An inactive employee remains visible in historical reports but cannot receive a
new payment unless reactivated.

### Salary Period

Table: `salary_periods`

One row represents one employee's payroll calculation for one calendar month.

| Field | Type | Rule |
| --- | --- | --- |
| id | integer | Primary key |
| employee_id | integer | Required foreign key |
| salary_month | date | Required; normalized to first day of month |
| currency | enum | AFN or USD snapshot |
| basic_salary | decimal | Non-negative salary snapshot |
| bonus | decimal | Non-negative |
| deduction | decimal | Non-negative |
| notes | text | Optional |
| created_at | datetime | Server generated |
| updated_at | datetime | Server generated |

Unique constraint: `(employee_id, salary_month)`.

The employee's current monthly salary initializes a new period. Later employee
salary changes do not rewrite historical periods.

Derived values:

```text
gross_pay = basic_salary + bonus
net_entitlement = max(gross_pay - deduction, 0)
advance_total = sum(active advance payments)
salary_payment_total = sum(active salary payments)
paid_total = advance_total + salary_payment_total
remaining = net_entitlement - paid_total
```

Status:

- `unpaid`: paid total is zero and remaining is positive
- `partial`: paid total is positive and remaining is positive
- `paid`: remaining is zero
- `overpaid`: remaining is below zero after confirmed overpayment

Money is calculated with decimal arithmetic and rounded to two places.

### Salary Payment

Table: `salary_payments`

| Field | Type | Rule |
| --- | --- | --- |
| id | integer | Primary key |
| salary_period_id | integer | Required foreign key |
| employee_id | integer | Required foreign key for reporting |
| cashbook_transaction_id | integer | Required unique foreign key |
| payment_kind | enum | salary or advance |
| payment_date | date | Required |
| amount | decimal | Required, greater than zero, payroll currency |
| source_amount | decimal | Amount entered in Cash Book |
| source_currency | enum | AFN or USD |
| exchange_rate | decimal | Required for cross-currency conversion |
| payment_method | enum | cash, bank, or hawala |
| paid_by | string | Optional |
| remarks | text | Optional |
| created_at | datetime | Server generated |
| updated_at | datetime | Server generated |

The payroll amount is a conversion snapshot. Later exchange-rate setting changes
do not alter historical payroll.

## Cash Book Integration

### Employee Selection

The Cash Out account selector searches normal accounts and employees. Employee
results display an Employee badge. Selection stores `account_id` and resolves
the linked `employee_id` on the backend.

The form requests a payroll summary for the selected employee and target month:

- Monthly salary
- Bonus and deduction
- Salary payments
- Advances
- Remaining salary
- Payroll currency

### Cash Out Classification

When the account belongs to an employee, show:

- Payroll classification: Salary Payment, Salary Advance, Other / Non-salary
- Salary month for Salary Payment or Salary Advance
- Current payroll summary
- Conversion explanation when currencies differ

For Salary Payment and Salary Advance:

- Transaction type must be Cash Out.
- Transaction category is `salary`.
- Detail is generated as:
  - `Salary payment for [Employee Name] - [Month YYYY]`
  - `Salary advance for [Employee Name] - [Month YYYY]`
- The user can add remarks without replacing the generated accounting detail.

For Other / Non-salary:

- Existing Cash Out behavior remains unchanged.
- No salary period or salary payment is created.

### Cross-Currency Conversion

The selected salary period currency is the payroll currency. The entered Cash
Book amount is the source currency.

- USD source to AFN payroll: `payroll_amount = source_usd * exchange_rate`
- AFN source to USD payroll: `payroll_amount = source_afn / exchange_rate`
- Same currency: no conversion

The confirmation UI shows source amount, rate, and payroll amount before save.
The exchange rate must be greater than zero for cross-currency payments.

### Atomic Create

1. Validate employee, month, amounts, currency, and rate.
2. Get or create the salary period using the employee salary snapshot.
3. Calculate the proposed remaining balance.
4. Require `confirm_overpayment=true` if the result is below zero or an already
   paid period receives another payment.
5. Create the Cash Book transaction without committing.
6. Create the linked salary payment without committing.
7. Commit once.
8. Return the transaction, payment, and refreshed payroll summary.

### Atomic Update

Editing either a payroll payment or its linked Cash Book transaction opens one
combined payroll edit flow. The backend recalculates the source and payroll
amounts, validates the target employee/month, updates both rows, and commits
once.

The generic Cash Book edit endpoint rejects changes to payroll-linked
transactions and returns a message directing the UI to the payroll edit flow.
This prevents hidden balance corruption.

### Atomic Delete

Deleting a payroll payment deletes the linked Cash Book transaction and salary
payment in one transaction after confirmation.

The generic Cash Book delete endpoint rejects payroll-linked transactions.
Empty salary periods may remain for reporting and manual bonus/deduction data.

## Backend API

New router groups:

- `/employees`
- `/salary-periods`
- `/salary-payments`
- `/salary-reports`

Core endpoints:

```text
GET    /employees
POST   /employees
GET    /employees/{id}
PATCH  /employees/{id}
DELETE /employees/{id}
GET    /employees/{id}/salary-summary?month=YYYY-MM
GET    /employees/{id}/salary-history

GET    /salary-periods
POST   /salary-periods
PATCH  /salary-periods/{id}

GET    /salary-payments
POST   /salary-payments
PATCH  /salary-payments/{id}
DELETE /salary-payments/{id}

GET    /salary-reports/dashboard
GET    /salary-reports/monthly
GET    /salary-reports/employee/{employee_id}
GET    /salary-reports/export
```

List endpoints accept pagination, search, employee, month, date range, status,
currency, department, and payment-method filters where applicable.

The employee delete endpoint performs a soft operational delete by changing the
status to inactive when payroll history exists. Hard deletion is allowed only
when the employee has no salary periods or payments.

## Frontend Structure

Add sidebar item: `Employees & Salary`.

Suggested focused modules:

```text
frontend/src/pages/EmployeesSalary.jsx
frontend/src/components/salary/SalaryDashboard.jsx
frontend/src/components/salary/EmployeeManager.jsx
frontend/src/components/salary/EmployeeForm.jsx
frontend/src/components/salary/EmployeeProfile.jsx
frontend/src/components/salary/SalaryPaymentForm.jsx
frontend/src/components/salary/SalaryRecords.jsx
frontend/src/components/salary/SalaryReports.jsx
frontend/src/components/salary/SalarySlip.jsx
frontend/src/components/salary/MonthlySalaryReport.jsx
frontend/src/api/salary.js
```

The page uses the current glass surface, rounded cards, soft shadows, typography,
button language, and white/blue theme. It does not add a second design system.

### Page Navigation

The module contains four clear tabs:

1. Overview
2. Employees
3. Salary Payments
4. Reports

### Overview

Summary cards:

- Total active employees
- Current-month payroll
- Paid this month
- Remaining this month
- Total bonuses
- Total deductions
- Total advances

Charts:

- Monthly paid versus remaining trend
- Department payroll distribution
- Payment status distribution

Charts use accessible colors and retain numeric labels or tooltips.

### Employee Management

- Search by ID, name, father name, phone, position, or department
- Filter by status, department, and currency
- Add/edit drawer or modal
- Profile view with salary summary and chronological history
- Delete confirmation with inactive fallback when history exists

### Salary Payment Entry

Fields:

- Employee
- Salary month
- Payment date
- Basic salary
- Bonus
- Deduction
- Advance
- Amount being paid
- Net entitlement
- Previously paid
- Remaining after payment
- Currency
- Exchange rate when needed
- Payment method
- Paid by
- Remarks

Basic salary is initialized from the period. Bonus and deduction update the
monthly period; advance creates an advance payment. The form must distinguish
the month's calculation from the amount being paid today.

### Salary Records

Desktop columns:

- S.No
- Date
- Month
- Employee
- Position
- Kind
- Basic salary
- Bonus
- Deduction
- Advance
- Amount paid
- Remaining
- Currency
- Payment method
- Remarks
- Actions

Actions: Edit, Delete, Print Salary Slip.

On narrow screens, each payment becomes a card with employee/month/status at the
top, key amounts in a compact grid, and visible actions at the bottom.

## Reports

### Monthly Salary Report

One row per employee/month with entitlement, salary payments, advances,
remaining, status, currency, and payment dates.

### Employee Salary History

Chronological periods and payment events for one employee, including linked
Cash Book transaction numbers.

### Filters

- Date range
- Salary month
- Employee
- Department
- Status
- Currency
- Payment method

AFN and USD totals remain separate. Reports do not add unlike currencies.

## Print and Export

### Salary Slip

A4 portrait layout:

- Company logo and company name
- Slip number and payment date
- Employee details
- Salary month
- Calculation section
- Payment and exchange-rate section
- Remaining balance
- Remarks
- Employee, Accountant, and Manager signature areas

### Monthly Salary Report

A4 landscape when needed, with repeating table headers, company branding,
filters, separate AFN/USD totals, and page-friendly row breaks.

### Export

- CSV: salary payment rows with proper CSV escaping
- JSON: versioned structured payroll export
- Excel: monthly report workbook
- PDF: print-layout PDF generation through the supported frontend approach
- Print: browser print CSS with non-report UI hidden

## Backup and Restore

The existing backup payload gains:

- `employees`
- `salary_periods`
- `salary_payments`
- a backup schema version

Restore order:

1. Settings and accounts
2. Employees
3. Cash Book transactions
4. Salary periods
5. Salary payments

Restore validates foreign keys and linked transaction IDs before commit. Import
uses one database transaction and rolls back completely on invalid payroll
links. Older backups without payroll arrays remain accepted with empty defaults.

## Validation and User Feedback

Backend validation is authoritative. Frontend validation provides immediate
feedback.

- Required employee and payment fields
- Unique employee code
- Non-negative salary, bonus, deduction, and advance
- Payment amount greater than zero
- Valid month and payment date
- Exchange rate greater than zero when currencies differ
- Deduction cannot reduce entitlement below zero without explicit correction
- Confirmation for overpayment and payments against a paid period
- Clear handling for inactive employees
- Success messages include employee, month, and amount
- API errors are displayed next to the relevant form and retain entered values

The existing transaction date schema remains a required date. Payroll requests
must send ISO dates and must not send empty strings or invalid placeholders.

## Authorization

Use the existing authenticated API dependency.

- Administrator and Manager: full employee and payroll access
- Cashier: create payments and view records; no employee deletion
- Viewer: read and print only

If the current role dependency does not expose route-level authorization, add a
small reusable role guard rather than duplicating checks in each router.

## Testing Strategy

### Backend

- Employee CRUD and account synchronization
- Unique employee codes
- Salary period uniqueness and snapshots
- Partial payment calculations
- Advance calculations
- AFN/USD conversion in both directions
- Confirmed and rejected overpayments
- Atomic rollback when either linked record fails
- Protected generic edit/delete for linked transactions
- Backup round trip and legacy backup compatibility
- Report filtering and separate currency totals

### Frontend

- Employee form validation
- Salary calculation preview
- Employee-aware Cash Out controls
- Confirmation flows
- Search and filters
- Desktop table and mobile cards
- Print-only layouts

### End-to-End Verification

- Build the React frontend.
- Run backend tests and database migration checks.
- Verify `/health` and `/health/database`.
- Use the local app at `http://127.0.0.1:5173/`.
- Create an employee, make partial salary and advance payments from both payroll
  and Cash Book, edit and delete them, then verify balances and Cash Book rows.
- Test AFN and USD employees with cross-currency payments.
- Test A4 print previews and responsive breakpoints.

## Delivery Sequence

Implementation should proceed in cohesive stages:

1. Database models, migrations, schemas, and payroll calculation service
2. Employee and payroll APIs with tests
3. Backup/restore and report APIs
4. Frontend API client and Employees & Salary module
5. Cash Book employee integration
6. Print/export and responsive polish
7. Full regression and browser verification

Each stage must preserve existing Cash Book behavior for non-employee accounts.

## Acceptance Criteria

- Employees can be created, edited, searched, viewed, deactivated, and safely
  deleted when they have no history.
- Monthly periods preserve historical salary snapshots.
- Partial salary and advance payments reduce the selected month's balance.
- Cross-currency payments use and preserve the selected exchange rate.
- Salary-page payments and employee-classified Cash Out entries create matching
  linked records.
- Editing or deleting linked records cannot leave Cash Book and payroll out of
  sync.
- Other / Non-salary employee Cash Out entries do not affect salary.
- Reports show correct separate AFN and USD totals.
- Salary slips and monthly reports print cleanly on A4.
- Payroll data exports and survives backup/restore.
- The module is usable on desktop, tablet, Android, and iPhone.
- Existing Cash Book, Ledger, Accounts, Reports, Converter, Backup, and Settings
  features continue to work.
