from datetime import date as DateType, datetime
from typing import Literal, Optional

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator


class AccountBase(BaseModel):
    name: str
    account_type: Literal["customer", "supplier", "worker", "factory", "expense", "other"] = "other"
    phone: str = ""
    address: str = ""
    opening_balance_afn: float = 0
    opening_balance_usd: float = 0
    note: str = ""


class AccountCreate(AccountBase):
    pass


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    account_type: Optional[Literal["customer", "supplier", "worker", "factory", "expense", "other"]] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    opening_balance_afn: Optional[float] = None
    opening_balance_usd: Optional[float] = None
    note: Optional[str] = None


class TransactionBase(BaseModel):
    date: DateType
    account_id: Optional[int] = None
    employee_id: Optional[int] = None
    salary_month: Optional[DateType] = None
    payroll_kind: Optional[Literal["salary", "advance"]] = None
    account_name: str
    detail: str
    transaction_type: Literal["cash_in", "cash_out"]
    cash_in_afn: float = 0
    cash_out_afn: float = 0
    usd_in: float = 0
    usd_out: float = 0
    exchange_rate: float = 0
    converted_afn: float = 0
    payment_method: Literal["cash", "bank", "hawala", "other"] = "cash"
    category: Literal["salary", "rent", "factory_expense", "home_expense", "bottles_account", "office_expense", "other"] = "other"
    note: str = ""


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    date: Optional[DateType] = None
    account_id: Optional[int] = None
    employee_id: Optional[int] = None
    salary_month: Optional[DateType] = None
    payroll_kind: Optional[Literal["salary", "advance"]] = None
    account_name: Optional[str] = None
    detail: Optional[str] = None
    transaction_type: Optional[Literal["cash_in", "cash_out"]] = None
    cash_in_afn: Optional[float] = None
    cash_out_afn: Optional[float] = None
    usd_in: Optional[float] = None
    usd_out: Optional[float] = None
    exchange_rate: Optional[float] = None
    converted_afn: Optional[float] = None
    payment_method: Optional[Literal["cash", "bank", "hawala", "other"]] = None
    category: Optional[Literal["salary", "rent", "factory_expense", "home_expense", "bottles_account", "office_expense", "other"]] = None
    note: Optional[str] = None


class SettingBase(BaseModel):
    company_name: str = "BAWAR STAR PLASTIC INDUSTRY"
    company_phone: str = ""
    company_email: str = ""
    company_website: str = ""
    company_tax_number: str = ""
    company_logo: str = ""
    company_address: str = ""
    company_license: str = ""
    default_exchange_rate: float = 64.3
    default_currency: str = "AFN"
    theme: str = "dark"
    language: str = "English"
    date_display_format: Literal["persian", "gregorian", "dual"] = "dual"
    print_footer_text: str = "Prepared by BAWAR STAR PLASTIC INDUSTRY"
    auto_logout_minutes: int = 30


class SettingUpdate(BaseModel):
    company_name: Optional[str] = None
    company_phone: Optional[str] = None
    company_email: Optional[str] = None
    company_website: Optional[str] = None
    company_tax_number: Optional[str] = None
    company_logo: Optional[str] = None
    company_address: Optional[str] = None
    company_license: Optional[str] = None
    default_exchange_rate: Optional[float] = None
    default_currency: Optional[str] = None
    theme: Optional[str] = None
    language: Optional[str] = None
    date_display_format: Optional[Literal["persian", "gregorian", "dual"]] = None
    print_footer_text: Optional[str] = None
    auto_logout_minutes: Optional[int] = None


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    full_name: str
    username: str
    role: str
    avatar_path: str = ""
    last_login: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    is_active: bool = True
    must_change_password: bool = False


class UserCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    full_name: str = Field(validation_alias=AliasChoices("full_name", "fullName", "name"))
    username: str
    password: str
    role: Literal["Administrator", "Manager", "Cashier", "Viewer"] = "Cashier"
    avatar_path: str = Field(default="", validation_alias=AliasChoices("avatar_path", "avatar", "avatarUrl"))
    is_active: bool = Field(default=True, validation_alias=AliasChoices("is_active", "status"))

    @field_validator("is_active", mode="before")
    @classmethod
    def parse_status(cls, value):
        if isinstance(value, str):
            return value.strip().lower() == "active"
        return value


class UserUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    full_name: Optional[str] = Field(default=None, validation_alias=AliasChoices("full_name", "fullName", "name"))
    username: Optional[str] = None
    role: Optional[Literal["Administrator", "Manager", "Cashier", "Viewer"]] = None
    avatar_path: Optional[str] = Field(default=None, validation_alias=AliasChoices("avatar_path", "avatar", "avatarUrl"))
    is_active: Optional[bool] = Field(default=None, validation_alias=AliasChoices("is_active", "status"))

    @field_validator("is_active", mode="before")
    @classmethod
    def parse_status(cls, value):
        if isinstance(value, str):
            return value.strip().lower() == "active"
        return value


class PasswordReset(BaseModel):
    password: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str
    remember_user: bool = False


class SetupRequest(BaseModel):
    full_name: str
    username: str = "admin"
    password: str
    confirm_password: str
    avatar_path: str = ""


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str


class LoginResponse(BaseModel):
    token: str
    expires_at: datetime
    user: UserPublic
    must_change_password: bool = False


class AccountRead(AccountBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class EmployeeCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    full_name: str = Field(min_length=1, max_length=255)
    father_name: str = ""
    phone: str = ""
    position: str = Field(min_length=1, max_length=180)
    department: str = ""
    joining_date: DateType
    monthly_salary: float = Field(ge=0)
    currency: Literal["AFN", "USD"] = "AFN"
    avatar_url: str = Field(default="", validation_alias=AliasChoices("avatar_url", "avatarUrl", "avatar"))
    status: Literal["active", "inactive"] = "active"
    notes: str = ""


class EmployeeUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    full_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    father_name: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = Field(default=None, min_length=1, max_length=180)
    department: Optional[str] = None
    joining_date: Optional[DateType] = None
    monthly_salary: Optional[float] = Field(default=None, ge=0)
    currency: Optional[Literal["AFN", "USD"]] = None
    avatar_url: Optional[str] = Field(default=None, validation_alias=AliasChoices("avatar_url", "avatarUrl", "avatar"))
    status: Optional[Literal["active", "inactive"]] = None
    notes: Optional[str] = None


class EmployeeRead(EmployeeCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_code: str
    account_id: int
    created_at: datetime
    updated_at: datetime


class SalaryPaymentCreate(BaseModel):
    employee_id: int
    month: int = Field(ge=1, le=12)
    year: int = Field(ge=2000, le=2100)
    amount: float = Field(gt=0)
    payment_date: DateType
    payment_method: Literal["cash", "bank", "hawala", "other"] = "cash"
    notes: str = ""


class SalaryPaymentUpdate(BaseModel):
    amount: Optional[float] = Field(default=None, gt=0)
    payment_date: Optional[DateType] = None
    payment_method: Optional[Literal["cash", "bank", "hawala", "other"]] = None
    notes: Optional[str] = None


class SalaryPaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    month: int
    year: int
    amount: float
    payment_date: DateType
    payment_method: str
    notes: str = ""
    previous_carry_forward_balance: float = 0
    total_payable_salary: float = 0
    carry_forward_balance: float = 0
    cashbook_entry_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class SalaryReportRow(BaseModel):
    employee_id: int
    employee_code: str
    employee_name: str
    department: str = ""
    position: str = ""
    monthly_salary: float
    previous_carry_forward_balance: float = 0
    total_payable_salary: float = 0
    paid_salary: float
    remaining_salary: float
    carry_forward_balance: float = 0
    payment_status: Literal["Paid", "Partial Paid", "Unpaid", "Advance"]
    last_payment_date: Optional[DateType] = None
    currency: str = "AFN"


class SalarySummaryTotals(BaseModel):
    total_employees: int
    total_monthly_salary: float
    total_payable_salary: float = 0
    total_paid_this_month: float
    total_remaining_salary: float
    fully_paid_employees: int
    unpaid_employees: int
    partial_paid_employees: int = 0


class SalaryReportResponse(BaseModel):
    month: int
    year: int
    rows: list[SalaryReportRow]
    summary: SalarySummaryTotals
    payments: list[SalaryPaymentRead] = Field(default_factory=list)


class SalaryHistoryCreate(BaseModel):
    new_salary: float = Field(ge=0)
    new_currency: Literal["AFN", "USD"]
    effective_date: DateType
    reason: str = Field(min_length=1, max_length=255)
    notes: str = ""


class SalaryHistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    old_salary: float
    new_salary: float
    old_currency: str
    new_currency: str
    effective_date: DateType
    changed_at: datetime
    changed_by: str
    reason: str
    notes: str = ""


class SalaryChangeReportRow(SalaryHistoryRead):
    employee_name: str
    employee_code: str


class TransactionRead(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    transaction_no: str
    created_at: datetime
    updated_at: datetime


class SettingRead(SettingBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class SummaryResponse(BaseModel):
    cash_in_afn: float
    cash_out_afn: float
    afn_balance: float
    usd_in: float
    usd_out: float
    usd_balance: float
    today_transactions: int
    monthly_transactions: int
    today_cash_in: float = 0
    today_cash_out: float = 0
    monthly_cash_in: float = 0
    monthly_cash_out: float = 0


class BackupPayload(BaseModel):
    accounts: list[AccountRead] = Field(default_factory=list)
    employees: list[EmployeeRead] = Field(default_factory=list)
    transactions: list[TransactionRead] = Field(default_factory=list)
    settings: SettingRead | None = None
    exported_at: datetime


class CsvImportRequest(BaseModel):
    content: str
    filename: str = "cashbook.csv"
