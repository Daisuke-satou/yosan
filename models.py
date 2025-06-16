from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class PeriodType(str, Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"

class ExpenseBase(BaseModel):
    date: str
    category: str
    amount: int = Field(gt=0, description="金額（円）")
    user: str
    description: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    pass

class Expense(ExpenseBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class BudgetBase(BaseModel):
    category: str
    amount: int = Field(gt=0, description="予算金額（円）")
    period: PeriodType = PeriodType.MONTHLY
    year: int
    month: Optional[int] = None

class BudgetCreate(BudgetBase):
    pass

class Budget(BudgetBase):
    id: int

    class Config:
        from_attributes = True

class CategoryBase(BaseModel):
    name: str
    color: str

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: int

    class Config:
        from_attributes = True

class BudgetSummary(BaseModel):
    category: str
    budget: int
    used: int
    remaining: int
    percentage: float
    color: str
    is_over_budget: bool

class MonthlyReport(BaseModel):
    month: str
    year: int
    total_expenses: int
    total_budget: int
    budget_utilization: float
    categories: List[BudgetSummary]
    expense_count: int