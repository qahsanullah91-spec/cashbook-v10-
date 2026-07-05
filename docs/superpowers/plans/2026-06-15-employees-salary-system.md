# Employees and Salary System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready Employees & Salary module that keeps monthly payroll and linked Cash Book transactions consistent, supports partial salary and advance payments, and provides responsive reporting, printing, export, and backup.

**Architecture:** Add normalized `employees`, `salary_periods`, and `salary_payments` tables with a payroll service that owns all calculations and linked Cash Book writes. Keep the existing React/Vite shell, add focused salary components and API methods, and extend Cash Out with employee classification and month selection. Backend calculations are authoritative; frontend calculations are previews.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, SQLite/PostgreSQL, React 18, Vite, Lucide React, Node test runner, Python `unittest`, browser print CSS, Vercel.

---

## File Structure

### Backend

- Create `backend/app/payroll.py`: decimal money helpers, period totals, currency conversion, and atomic payroll transaction service.
- Create `backend/app/routes/employees.py`: employee CRUD, search, profile, and salary summary endpoints.
- Create `backend/app/routes/salary.py`: salary period, payment, dashboard, report, and export endpoints.
- Create `backend/tests/test_payroll.py`: calculation, conversion, partial payment, overpayment, and rollback tests.
- Create `backend/tests/test_employees_api.py`: employee lifecycle and account synchronization tests.
- Create `backend/tests/test_salary_api.py`: authenticated API integration and linked Cash Book tests.
- Modify `backend/app/models.py`: Employee, SalaryPeriod, SalaryPayment models and relationships.
- Modify `backend/app/schemas.py`: employee/payroll request and response contracts plus transaction payroll fields.
- Modify `backend/app/database.py`: SQLite compatibility migrations and payroll indexes.
- Modify `backend/app/crud.py`: no-commit transaction primitives, linked transaction guards, backup/restore extensions.
- Modify `backend/app/routes/transactions.py`: route employee payroll Cash Out through payroll service.
- Modify `backend/app/routes/backup.py`: versioned salary backup payload.
- Modify `backend/app/auth_dependencies.py`: reusable role guard.
- Modify `backend/app/main.py`: register employee and salary routers.

### Frontend

- Create `frontend/src/services/salary.js`: salary API functions and query-string helpers.
- Create `frontend/src/utils/payroll.js`: preview calculations, currency formatting, filters, and export helpers.
- Create `frontend/src/utils/payroll.test.js`: calculation and filter tests.
- Create `frontend/src/pages/EmployeesSalary.jsx`: module-level tab and data orchestration.
- Create `frontend/src/components/salary/SalaryOverview.jsx`: summary cards and CSS-native charts.
- Create `frontend/src/components/salary/EmployeeManager.jsx`: search, filters, table/cards, and profile action.
- Create `frontend/src/components/salary/EmployeeForm.jsx`: add/edit employee form.
- Create `frontend/src/components/salary/EmployeeProfile.jsx`: profile, salary summary, and histories.
- Create `frontend/src/components/salary/SalaryPaymentForm.jsx`: payment/advance form and live calculation.
- Create `frontend/src/components/salary/SalaryRecords.jsx`: records table and mobile cards.
- Create `frontend/src/components/salary/SalaryReports.jsx`: report filters, totals, exports, and print actions.
- Create `frontend/src/components/salary/SalarySlip.jsx`: A4 salary slip.
- Create `frontend/src/components/salary/MonthlySalaryReport.jsx`: A4 monthly report.
- Create `frontend/src/components/EmployeeAccountPicker.jsx`: searchable employee/account selector.
- Create `frontend/src/components/EmployeeSalaryStatus.jsx`: Cash Out payroll status card.
- Modify `frontend/src/services/api.js`: employee-aware transaction methods and salary API export.
- Modify `frontend/src/components/Sidebar.jsx`: Employees & Salary item.
- Modify `frontend/src/components/TransactionForm.jsx`: account suggestions and Salary Payment / Salary Advance / Other / Non-salary classification fields.
- Modify `frontend/src/pages/CashBook.jsx`: pass employee and payroll props.
- Modify `frontend/src/App.jsx`: lazy salary page, salary state, Cash Out integration, linked edit/delete, print/export actions.
- Modify `frontend/src/index.css`: premium salary module, responsive cards, dropdown, charts, and A4 styles.

## Task 1: Payroll Calculation Domain

**Files:**
- Create: `backend/app/payroll.py`
- Create: `backend/tests/test_payroll.py`

- [ ] **Step 1: Write failing money and period calculation tests**

```python
from decimal import Decimal

from app.payroll import calculate_period, convert_payment


def test_period_calculates_partial_salary_and_advance():
    totals = calculate_period(
        basic_salary=Decimal("50000"),
        bonus=Decimal("2000"),
        deduction=Decimal("1000"),
        salary_paid=Decimal("10000"),
        advances=Decimal("5000"),
    )
    assert totals.net_entitlement == Decimal("51000.00")
    assert totals.paid_total == Decimal("15000.00")
    assert totals.remaining == Decimal("36000.00")
    assert totals.status == "partial"


def test_afn_payment_converts_to_usd_payroll():
    assert convert_payment(
        Decimal("6430"), "AFN", "USD", Decimal("64.30")
    ) == Decimal("100.00")
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `python -m unittest tests.test_payroll -v` from `backend`

Expected: import failure because `app.payroll` does not exist.

- [ ] **Step 3: Implement decimal calculation helpers**

```python
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

CENT = Decimal("0.01")


def money(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(CENT, rounding=ROUND_HALF_UP)


@dataclass(frozen=True)
class PeriodTotals:
    gross_pay: Decimal
    net_entitlement: Decimal
    salary_paid: Decimal
    advances: Decimal
    paid_total: Decimal
    remaining: Decimal
    status: str


def calculate_period(*, basic_salary, bonus, deduction, salary_paid, advances):
    gross = money(basic_salary) + money(bonus)
    entitlement = max(gross - money(deduction), Decimal("0.00"))
    paid = money(salary_paid)
    advance = money(advances)
    remaining = entitlement - paid - advance
    status = "overpaid" if remaining < 0 else "paid" if remaining == 0 else "partial" if paid + advance > 0 else "unpaid"
    return PeriodTotals(gross, entitlement, paid, advance, paid + advance, remaining, status)


def convert_payment(amount, source_currency, payroll_currency, exchange_rate):
    amount = money(amount)
    rate = money(exchange_rate)
    if source_currency == payroll_currency:
        return amount
    if rate <= 0:
        raise ValueError("Exchange rate must be greater than zero")
    converted = amount * rate if source_currency == "USD" else amount / rate
    return money(converted)
```

- [ ] **Step 4: Run tests and verify GREEN**

Run: `python -m unittest tests.test_payroll -v`

Expected: all calculation tests pass.

- [ ] **Step 5: Commit**

```powershell
git add backend/app/payroll.py backend/tests/test_payroll.py
git commit -m "feat: add payroll calculation domain"
```

## Task 2: Payroll Database Models and SQLite Migration

**Files:**
- Modify: `backend/app/models.py`
- Modify: `backend/app/database.py`
- Modify: `backend/app/schemas.py`
- Test: `backend/tests/test_payroll.py`

- [ ] **Step 1: Add failing model contract tests**

Test unique employee code, one account per employee, unique employee/month period,
and unique Cash Book transaction per salary payment.

```python
def test_employee_and_period_constraints(db):
    employee = Employee(employee_code="EMP-0001", account_id=1, full_name="Ahmad Khan", position="Manager", joining_date=date(2026, 1, 1), monthly_salary=50000, currency="AFN")
    db.add(employee)
    db.flush()
    db.add(SalaryPeriod(employee_id=employee.id, salary_month=date(2026, 6, 1), currency="AFN", basic_salary=50000))
    db.commit()
    assert employee.employee_code == "EMP-0001"
```

- [ ] **Step 2: Run the model tests and verify RED**

Run: `python -m unittest tests.test_payroll.PayrollModelTests -v`

Expected: missing Employee/SalaryPeriod model failure.

- [ ] **Step 3: Add SQLAlchemy models**

Add `Employee`, `SalaryPeriod`, and `SalaryPayment` with:

```python
__table_args__ = (
    UniqueConstraint("employee_id", "salary_month", name="uq_salary_period_employee_month"),
)
```

Use `Numeric(14, 2)` for payroll money. Add `employee_id`,
`salary_period_id`, and unique `cashbook_transaction_id` foreign keys. Add
relationships without cascading deletion across historical Cash Book records.

- [ ] **Step 4: Add Pydantic contracts**

Define:

```python
class EmployeeCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    father_name: str = ""
    phone: str = ""
    email: str = ""
    department: str = ""
    position: str = Field(min_length=1, max_length=180)
    joining_date: DateType
    monthly_salary: Decimal = Field(ge=0)
    currency: Literal["AFN", "USD"] = "AFN"
    salary_payment_day: int | None = Field(default=None, ge=1, le=31)
    status: Literal["active", "inactive"] = "active"
    address: str = ""
    notes: str = ""
    photo: str = ""
```

Add read/update schemas, salary period schemas, payment schemas, salary summary,
dashboard, and report row schemas. Extend transaction create/update with
optional `employee_id`, `payroll_kind`, `salary_month`, `source_currency`, and
`confirm_overpayment`.

- [ ] **Step 5: Extend SQLite compatibility migration**

Create missing payroll tables through `Base.metadata.create_all`, then add
transaction linkage columns for older SQLite databases:

```python
for column_sql in [
    "employee_id INTEGER",
    "payroll_kind VARCHAR(20)",
    "salary_month DATE",
]:
    add("transactions", column_sql)
```

- [ ] **Step 6: Run backend tests**

Run: `python -m unittest discover -s tests -v`

Expected: payroll model tests and existing deployment/security/schema tests pass.

- [ ] **Step 7: Commit**

```powershell
git add backend/app/models.py backend/app/database.py backend/app/schemas.py backend/tests/test_payroll.py
git commit -m "feat: add employee and payroll schema"
```

## Task 3: Employee Service and API

**Files:**
- Create: `backend/app/routes/employees.py`
- Create: `backend/tests/test_employees_api.py`
- Modify: `backend/app/payroll.py`
- Modify: `backend/app/auth_dependencies.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Write failing employee API tests**

Cover auto-generated `EMP-0001`, linked account creation, name synchronization,
search, inactive filtering, profile history, and protected deletion.

```python
def test_create_employee_creates_linked_account(client, admin_headers):
    response = client.post("/api/employees", headers=admin_headers, json={
        "full_name": "Ahmad Khan",
        "position": "Manager",
        "joining_date": "2026-01-01",
        "monthly_salary": 50000,
        "currency": "AFN",
    })
    assert response.status_code == 201
    body = response.json()
    assert body["employee_code"] == "EMP-0001"
    assert body["account_id"]
```

- [ ] **Step 2: Verify RED**

Run: `python -m unittest tests.test_employees_api -v`

Expected: 404 for `/api/employees`.

- [ ] **Step 3: Add reusable role guard**

```python
def require_roles(*roles):
    def dependency(user=Depends(require_authenticated_request)):
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permission")
        return user
    return dependency
```

- [ ] **Step 4: Implement employee service helpers**

Implement `next_employee_code`, `create_employee`, `update_employee`,
`list_employees`, `employee_profile`, and `delete_or_deactivate_employee`.
Create the linked Account with `account_type="worker"` and preserve `account_id`
as the integration key.

- [ ] **Step 5: Implement employee routes**

Use Administrator/Manager for employee writes, authenticated users for reads,
and Administrator only for hard delete. Add query parameters for `search`,
`status`, `department`, and `currency`.

- [ ] **Step 6: Register router and verify GREEN**

Modify `backend/app/main.py`:

```python
from .routes import employees
app.include_router(employees.router)
```

Run: `python -m unittest tests.test_employees_api -v`

- [ ] **Step 7: Commit**

```powershell
git add backend/app/routes/employees.py backend/app/payroll.py backend/app/auth_dependencies.py backend/app/main.py backend/tests/test_employees_api.py
git commit -m "feat: add employee management API"
```

## Task 4: Atomic Salary and Cash Book Service

**Files:**
- Modify: `backend/app/payroll.py`
- Modify: `backend/app/crud.py`
- Modify: `backend/app/routes/transactions.py`
- Create: `backend/app/routes/salary.py`
- Create: `backend/tests/test_salary_api.py`

- [ ] **Step 1: Write failing integration tests**

Cover salary payment, advance, Other/Non-salary, cross-currency payment,
overpayment confirmation, rollback, linked update, and linked delete.

```python
def test_employee_cash_out_creates_salary_payment(client, admin_headers, employee):
    response = client.post("/api/transactions", headers=admin_headers, json={
        "date": "2026-06-15",
        "account_id": employee.account_id,
        "account_name": employee.full_name,
        "detail": "Salary payment",
        "transaction_type": "cash_out",
        "cash_out_afn": 10000,
        "exchange_rate": 64.3,
        "category": "salary",
        "payment_method": "cash",
        "employee_id": employee.id,
        "payroll_kind": "salary",
        "salary_month": "2026-06-01",
        "source_currency": "AFN",
    })
    assert response.status_code == 201
    summary = client.get(f"/api/employees/{employee.id}/salary-summary?month=2026-06", headers=admin_headers).json()
    assert summary["salary_paid"] == 10000
    assert summary["remaining"] == 40000
```

- [ ] **Step 2: Verify RED**

Run: `python -m unittest tests.test_salary_api -v`

- [ ] **Step 3: Split transaction persistence from commit**

Add `_build_transaction`, `create_transaction_no_commit`,
`update_transaction_no_commit`, and `delete_transaction_no_commit`. Keep current
public CRUD behavior by wrapping these helpers in `commit/refresh`.

- [ ] **Step 4: Implement atomic payroll payment service**

`create_payroll_payment` must:

1. validate active employee and selected month;
2. get/create salary period with salary snapshot;
3. convert source amount to payroll currency;
4. calculate resulting balance;
5. require confirmation when paid/overpaid;
6. create Cash Book transaction with generated detail;
7. flush and create SalaryPayment;
8. commit once and return both records plus summary.

Rollback on every exception.

- [ ] **Step 5: Protect generic linked updates and deletes**

In generic transaction routes:

```python
if tx.salary_payment:
    raise HTTPException(
        status_code=409,
        detail="Payroll-linked transactions must be edited from Employees & Salary",
    )
```

- [ ] **Step 6: Add salary routes**

Implement:

```text
GET    /api/salary/periods
POST   /api/salary/periods
PATCH  /api/salary/periods/{id}
GET    /api/salary/payments
POST   /api/salary/payments
PUT    /api/salary/payments/{id}
DELETE /api/salary/payments/{id}
GET    /api/salary/dashboard
GET    /api/salary/reports/monthly
GET    /api/salary/reports/employee/{employee_id}
```

- [ ] **Step 7: Route employee Cash Out through payroll service**

When `payroll_kind` is `salary` or `advance`, call the payroll service. When it
is `other` or absent, preserve the existing Cash Book behavior.

- [ ] **Step 8: Verify GREEN and regression**

Run:

```powershell
python -m unittest tests.test_salary_api -v
python -m unittest discover -s tests -v
```

- [ ] **Step 9: Commit**

```powershell
git add backend/app/payroll.py backend/app/crud.py backend/app/routes/transactions.py backend/app/routes/salary.py backend/app/main.py backend/tests/test_salary_api.py
git commit -m "feat: integrate payroll with cash book"
```

## Task 5: Backup, Restore, and Salary Export APIs

**Files:**
- Modify: `backend/app/crud.py`
- Modify: `backend/app/schemas.py`
- Modify: `backend/app/routes/backup.py`
- Modify: `backend/app/routes/salary.py`
- Create: `backend/tests/test_salary_backup.py`

- [ ] **Step 1: Write failing backup round-trip tests**

Assert `schema_version`, employees, periods, and payments are exported and
restored in foreign-key order. Assert old backups without payroll arrays import
successfully.

- [ ] **Step 2: Verify RED**

Run: `python -m unittest tests.test_salary_backup -v`

- [ ] **Step 3: Extend backup payload**

```python
return {
    "schema_version": 2,
    "accounts": ...,
    "transactions": ...,
    "employees": ...,
    "salary_periods": ...,
    "salary_payments": ...,
    "settings": ...,
    "exported_at": datetime.utcnow(),
}
```

- [ ] **Step 4: Restore transactionally in dependency order**

For replacement restore, delete salary payments, periods, employees,
transactions, then accounts. Import accounts, employees, transactions, periods,
and payments. Validate every referenced ID before commit.

- [ ] **Step 5: Add CSV/JSON/Excel endpoints**

Use `StreamingResponse` for CSV and JSON. Use the existing `openpyxl`
dependency for Excel. Keep AFN and USD totals separate.

- [ ] **Step 6: Verify and commit**

Run: `python -m unittest tests.test_salary_backup -v`

```powershell
git add backend/app/crud.py backend/app/schemas.py backend/app/routes/backup.py backend/app/routes/salary.py backend/tests/test_salary_backup.py
git commit -m "feat: add payroll backup and exports"
```

## Task 6: Frontend Payroll Utilities and API Client

**Files:**
- Create: `frontend/src/services/salary.js`
- Create: `frontend/src/utils/payroll.js`
- Create: `frontend/src/utils/payroll.test.js`
- Modify: `frontend/src/services/api.js`

- [ ] **Step 1: Write failing frontend utility tests**

```javascript
test('calculatePayrollPreview includes advance in paid total', () => {
  assert.deepEqual(calculatePayrollPreview({
    basicSalary: 50000,
    bonus: 2000,
    deduction: 1000,
    salaryPaid: 10000,
    advance: 5000
  }), {
    netEntitlement: 51000,
    paidTotal: 15000,
    remaining: 36000,
    status: 'partial'
  });
});
```

- [ ] **Step 2: Verify RED**

Run: `npm.cmd test -- src/utils/payroll.test.js`

- [ ] **Step 3: Implement frontend helpers**

Add `calculatePayrollPreview`, `formatPayrollMoney`, `normalizeSalaryMonth`,
`filterEmployees`, `filterSalaryRows`, `downloadBlob`, and `csvCell`.

- [ ] **Step 4: Add salary API methods**

Use the existing authenticated request wrapper. Expose employee CRUD, summaries,
periods, payments, dashboard, reports, and export downloads.

- [ ] **Step 5: Verify GREEN and build**

Run:

```powershell
npm.cmd test
npm.cmd run build
```

Record the existing print timing test separately if it remains flaky; do not
change unrelated print behavior in this task.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/services/api.js frontend/src/services/salary.js frontend/src/utils/payroll.js frontend/src/utils/payroll.test.js
git commit -m "feat: add payroll frontend services"
```

## Task 7: Employees & Salary Responsive Module

**Files:**
- Create: `frontend/src/pages/EmployeesSalary.jsx`
- Create: `frontend/src/components/salary/SalaryOverview.jsx`
- Create: `frontend/src/components/salary/EmployeeManager.jsx`
- Create: `frontend/src/components/salary/EmployeeForm.jsx`
- Create: `frontend/src/components/salary/EmployeeProfile.jsx`
- Create: `frontend/src/components/salary/SalaryPaymentForm.jsx`
- Create: `frontend/src/components/salary/SalaryRecords.jsx`
- Modify: `frontend/src/components/Sidebar.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Add lazy route and sidebar item**

```javascript
const EmployeesSalary = lazy(() => import('./pages/EmployeesSalary'));
```

Sidebar item:

```javascript
{ id: 'salary', label: 'Employees & Salary', icon: UserRoundCog }
```

- [ ] **Step 2: Build the page shell**

Create tabs `Overview`, `Employees`, `Salary Payments`, and `Reports`. Fetch only
the active tab's heavier data, while keeping employees cached for selectors.

- [ ] **Step 3: Build overview cards and charts**

Render seven requested cards. Implement accessible bar/distribution charts with
CSS grid/bars and text values; do not add a chart dependency.

- [ ] **Step 4: Build employee management**

Provide add/edit drawer, profile view, search, status/department/currency
filters, desktop table, and mobile cards. Employee photo uses a file input read
as a compressed data URL consistent with company-logo storage.

- [ ] **Step 5: Build salary payment form**

Keep period calculation fields visually separate from today's payment. Show
basic salary, bonus, deduction, advance, net entitlement, previously paid,
today's amount, and remaining after payment. Show an explicit confirmation
dialog for paid periods and overpayment.

- [ ] **Step 6: Build records table/mobile cards**

Use the approved columns and actions. Status labels must be `Paid`,
`Partially Paid`, `Pending`, and `Overpaid`.

- [ ] **Step 7: Add premium responsive styles**

Reuse existing glass surfaces and button classes. Add:

```css
.salary-stat-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:16px; }
.salary-mobile-list { display:none; }
@media (max-width: 760px) {
  .salary-stat-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .salary-records-table { display:none; }
  .salary-mobile-list { display:grid; gap:12px; }
}
```

- [ ] **Step 8: Build and browser-check navigation**

Run `npm.cmd run build`, open `http://127.0.0.1:5173/`, sign in using the
existing session, navigate to Employees & Salary, and verify each tab.

- [ ] **Step 9: Commit**

```powershell
git add frontend/src/pages/EmployeesSalary.jsx frontend/src/components/salary frontend/src/components/Sidebar.jsx frontend/src/App.jsx frontend/src/index.css
git commit -m "feat: add employees salary workspace"
```

## Task 8: Employee-Aware Cash Out Form

**Files:**
- Create: `frontend/src/components/EmployeeAccountPicker.jsx`
- Create: `frontend/src/components/EmployeeSalaryStatus.jsx`
- Modify: `frontend/src/components/TransactionForm.jsx`
- Modify: `frontend/src/pages/CashBook.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/index.css`
- Test: `frontend/src/utils/payroll.test.js`

- [ ] **Step 1: Add failing payload construction tests**

Test that salary and advance payloads include `employee_id`, selected month,
classification, source currency, and generated detail; Other omits payroll
linkage.

- [ ] **Step 2: Verify RED**

Run: `npm.cmd test -- src/utils/payroll.test.js`

- [ ] **Step 3: Add searchable employee/account picker**

Show up to eight matches, keyboard navigation, an Employee badge, position, and
account type. Selecting an employee stores both `account_id` and `employee_id`;
never infer payroll linkage from text after selection.

- [ ] **Step 4: Add Cash Out payroll controls**

For selected employees show:

- Salary Payment / Salary Advance / Other / Non-salary
- Salary month
- source currency
- Employee Salary Status card
- warnings returned by the backend

- [ ] **Step 5: Submit employee Cash Out payload**

Generate:

```javascript
detail: payrollKind === 'advance'
  ? `Salary advance for ${employee.full_name} - ${monthLabel}`
  : `Salary payment for ${employee.full_name} - ${monthLabel}`
```

Refresh transactions, summary, employee salary summary, and salary records after
save.

- [ ] **Step 6: Route linked edits/deletes**

When a transaction has payroll linkage, open the salary payment edit flow or
delete confirmation instead of generic transaction mutation.

- [ ] **Step 7: Verify core interaction**

Create a 50,000 AFN employee, save a 10,000 AFN salary Cash Out, and verify:

- Cash Book row exists;
- salary paid is 10,000;
- remaining is 40,000;
- employee ledger contains the Cash Out;
- deleting it restores remaining to 50,000.

- [ ] **Step 8: Commit**

```powershell
git add frontend/src/components/EmployeeAccountPicker.jsx frontend/src/components/EmployeeSalaryStatus.jsx frontend/src/components/TransactionForm.jsx frontend/src/pages/CashBook.jsx frontend/src/App.jsx frontend/src/index.css frontend/src/utils/payroll.test.js
git commit -m "feat: connect employee cash out to payroll"
```

## Task 9: Reports, Salary Slip, and A4 Printing

**Files:**
- Create: `frontend/src/components/salary/SalaryReports.jsx`
- Create: `frontend/src/components/salary/SalarySlip.jsx`
- Create: `frontend/src/components/salary/MonthlySalaryReport.jsx`
- Modify: `frontend/src/pages/EmployeesSalary.jsx`
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/utils/printEngine.js`
- Modify: `frontend/src/utils/printEngine.test.js`

- [ ] **Step 1: Write failing print-report tests**

Test salary slip and monthly report model creation, separate currency totals,
company branding, and signature labels.

- [ ] **Step 2: Verify RED**

Run: `npm.cmd test -- src/utils/printEngine.test.js`

- [ ] **Step 3: Build reports workspace**

Add Employee Salary Report, Monthly Salary Report, Advance Report, Department
Salary Report, and Yearly Payroll Report modes with date/month, employee,
department, status, currency, and payment-method filters.

- [ ] **Step 4: Implement salary slip**

Render company logo/name, employee information, salary calculation, payment
information, remaining balance, remarks, and three signature blocks.

- [ ] **Step 5: Implement monthly report**

Use landscape A4, repeated headers, page-safe rows, filter summary, and separate
AFN/USD totals.

- [ ] **Step 6: Add print CSS**

```css
@page { size: A4 portrait; margin: 12mm; }
@media print {
  body * { visibility:hidden; }
  .salary-print-root, .salary-print-root * { visibility:visible; }
  .salary-print-root { position:absolute; inset:0; width:100%; }
  .salary-report-landscape { page: salary-landscape; }
}
@page salary-landscape { size:A4 landscape; margin:10mm; }
```

- [ ] **Step 7: Add PDF output through the A4 print workflow**

Label the report action `Print / Save as PDF`. It must open the same verified A4
document used for printing, so Chrome, Edge, Android, and iOS users can select
their native Save as PDF destination without maintaining a second layout engine.

- [ ] **Step 8: Verify print previews**

Check salary slip at A4 portrait and monthly report at A4 landscape. Confirm no
clipped signatures, table headers repeat, and action controls are hidden.

- [ ] **Step 9: Commit**

```powershell
git add frontend/src/components/salary/SalaryReports.jsx frontend/src/components/salary/SalarySlip.jsx frontend/src/components/salary/MonthlySalaryReport.jsx frontend/src/pages/EmployeesSalary.jsx frontend/src/index.css frontend/src/utils/printEngine.js frontend/src/utils/printEngine.test.js
git commit -m "feat: add payroll reports and printing"
```

## Task 10: Full Verification, Security Review, and Production Delivery

**Files:**
- Modify only files required by discovered defects.

- [ ] **Step 1: Run all backend tests**

Run: `python -m unittest discover -s tests -v` from `backend`.

Expected: zero failures.

- [ ] **Step 2: Run frontend tests and build**

```powershell
npm.cmd test
npm.cmd run build
```

Expected: zero failures and a production bundle with no
`http://localhost:8000`.

- [ ] **Step 3: Run security checks**

Verify:

- unauthenticated payroll APIs return 401;
- Cashier cannot delete employees;
- Viewer cannot mutate payroll;
- linked generic transaction edits/deletes return 409;
- negative values and invalid rates return 422;
- backup restore rejects broken foreign keys.

- [ ] **Step 4: Browser desktop workflow**

At `http://127.0.0.1:5173/`:

1. create AFN and USD employees;
2. create partial salary and advance payments;
3. test AFN-to-USD and USD-to-AFN conversions;
4. edit and delete linked records;
5. print salary slip and monthly report;
6. export CSV, JSON, and Excel;
7. backup, clear test data, restore, and verify balances.

- [ ] **Step 5: Browser responsive workflow**

Test desktop, tablet, and a 390x844 mobile viewport. Confirm no horizontal page
overflow, mobile salary cards replace wide tables, dropdowns remain visible,
and actions are reachable.

- [ ] **Step 6: Regression check existing modules**

Open Dashboard, Cash Book, Ledger, Accounts, Reports, Converter, Backup, and
Settings. Exercise one meaningful action in each and inspect console errors.

- [ ] **Step 7: Review git diff and commit fixes**

```powershell
git diff --check
git status --short
```

Commit only verified defect corrections.

- [ ] **Step 8: Push and deploy**

Push the current branch. Because Vercel team collaboration blocks Git-authored
deployments from `ahsanullahqureshi888@gmail.com`, deploy from a clean staging
directory without `.git`, using the linked `.vercel/project.json`, until Vercel
team access is corrected.

- [ ] **Step 9: Verify production**

At `https://bawar-star-cash-book.vercel.app/` verify:

- `/health` returns `{"status":"ok"}`;
- `/health/database` returns healthy;
- login initialization has no Failed to fetch;
- salary APIs and main employee/payroll workflow work;
- deployment status is Ready and the production alias points to it.

## Acceptance Checklist

- [ ] Employee CRUD, profile, photo, search, salary history, and advance history work.
- [ ] Employee IDs auto-generate and linked Cash Book accounts remain synchronized.
- [ ] Cash Out requires Salary Payment, Salary Advance, or Other for employees.
- [ ] Salary and advance payments target a selected month.
- [ ] Partial payments and advances reduce the correct monthly balance.
- [ ] Cross-currency payments preserve the exchange-rate snapshot.
- [ ] Overpayment and paid-period warnings require confirmation.
- [ ] Linked create/update/delete operations are atomic.
- [ ] Dashboard cards and requested charts use real payroll data.
- [ ] Salary records work as desktop tables and mobile cards.
- [ ] Salary slip and monthly report print correctly on A4.
- [ ] Employee, monthly, advance, department, and yearly reports work.
- [ ] CSV, JSON, Excel, PDF/print, and backup/restore include payroll data.
- [ ] Existing ERP modules remain functional.
- [ ] Local and production health checks pass.
