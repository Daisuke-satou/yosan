from typing import List, Optional, Dict
from models import Expense, Budget, Category, ExpenseCreate, BudgetCreate, CategoryCreate, BudgetSummary, MonthlyReport
from datetime import datetime
import json

class Database:
    def __init__(self):
        self.expenses: Dict[int, Expense] = {}
        self.budgets: Dict[int, Budget] = {}
        self.categories: Dict[int, Category] = {}
        self.expense_id_counter = 1
        self.budget_id_counter = 1
        self.category_id_counter = 1
        
        # 初期カテゴリを作成
        self._initialize_categories()
    
    def _initialize_categories(self):
        default_categories = [
            {"name": "交通費", "color": "#2563EB"},
            {"name": "食費", "color": "#10B981"},
            {"name": "接待費", "color": "#EF4444"},
            {"name": "オフィス用品", "color": "#F59E0B"},
            {"name": "その他", "color": "#64748B"},
        ]
        
        for cat_data in default_categories:
            self.create_category(CategoryCreate(**cat_data))
    
    # 支出関連メソッド
    def create_expense(self, expense_data: ExpenseCreate) -> Expense:
        expense = Expense(
            id=self.expense_id_counter,
            **expense_data.model_dump(),
            created_at=datetime.now()
        )
        self.expenses[self.expense_id_counter] = expense
        self.expense_id_counter += 1
        return expense
    
    def get_expenses(self, year: Optional[int] = None, month: Optional[int] = None) -> List[Expense]:
        expenses = list(self.expenses.values())
        
        if year and month:
            expenses = [e for e in expenses if self._is_expense_in_month(e, year, month)]
        elif year:
            expenses = [e for e in expenses if self._is_expense_in_year(e, year)]
            
        return sorted(expenses, key=lambda x: x.date, reverse=True)
    
    def get_expense(self, expense_id: int) -> Optional[Expense]:
        return self.expenses.get(expense_id)
    
    def update_expense(self, expense_id: int, expense_data: ExpenseCreate) -> Optional[Expense]:
        if expense_id in self.expenses:
            expense = self.expenses[expense_id]
            updated_expense = Expense(
                id=expense.id,
                created_at=expense.created_at,
                **expense_data.model_dump()
            )
            self.expenses[expense_id] = updated_expense
            return updated_expense
        return None
    
    def delete_expense(self, expense_id: int) -> bool:
        return self.expenses.pop(expense_id, None) is not None
    
    # 予算関連メソッド
    def create_budget(self, budget_data: BudgetCreate) -> Budget:
        budget = Budget(
            id=self.budget_id_counter,
            **budget_data.model_dump()
        )
        self.budgets[self.budget_id_counter] = budget
        self.budget_id_counter += 1
        return budget
    
    def get_budgets(self, year: Optional[int] = None, month: Optional[int] = None) -> List[Budget]:
        budgets = list(self.budgets.values())
        
        if year:
            budgets = [b for b in budgets if b.year == year]
            if month:
                budgets = [b for b in budgets if b.period == "monthly" and b.month == month]
        
        return budgets
    
    def get_budget(self, budget_id: int) -> Optional[Budget]:
        return self.budgets.get(budget_id)
    
    def update_budget(self, budget_id: int, budget_data: BudgetCreate) -> Optional[Budget]:
        if budget_id in self.budgets:
            updated_budget = Budget(
                id=budget_id,
                **budget_data.model_dump()
            )
            self.budgets[budget_id] = updated_budget
            return updated_budget
        return None
    
    def delete_budget(self, budget_id: int) -> bool:
        return self.budgets.pop(budget_id, None) is not None
    
    # カテゴリ関連メソッド
    def create_category(self, category_data: CategoryCreate) -> Category:
        category = Category(
            id=self.category_id_counter,
            **category_data.model_dump()
        )
        self.categories[self.category_id_counter] = category
        self.category_id_counter += 1
        return category
    
    def get_categories(self) -> List[Category]:
        return list(self.categories.values())
    
    # レポート関連メソッド
    def get_monthly_report(self, year: int, month: int) -> MonthlyReport:
        monthly_expenses = self.get_expenses(year, month)
        budget_summary = self.get_budget_summary(year, month)
        
        total_expenses = sum(e.amount for e in monthly_expenses)
        total_budget = sum(s.budget for s in budget_summary)
        budget_utilization = (total_expenses / total_budget * 100) if total_budget > 0 else 0
        
        return MonthlyReport(
            month=f"{year}年{month}月",
            year=year,
            total_expenses=total_expenses,
            total_budget=total_budget,
            budget_utilization=budget_utilization,
            categories=budget_summary,
            expense_count=len(monthly_expenses)
        )
    
    def get_budget_summary(self, year: int, month: Optional[int] = None) -> List[BudgetSummary]:
        budgets = self.get_budgets(year, month)
        expenses = self.get_expenses(year, month)
        categories = {cat.name: cat.color for cat in self.get_categories()}
        
        summary = []
        for budget in budgets:
            category_expenses = sum(
                e.amount for e in expenses if e.category == budget.category
            )
            
            remaining = budget.amount - category_expenses
            percentage = (category_expenses / budget.amount * 100) if budget.amount > 0 else 0
            is_over_budget = category_expenses > budget.amount
            
            summary.append(BudgetSummary(
                category=budget.category,
                budget=budget.amount,
                used=category_expenses,
                remaining=remaining,
                percentage=min(percentage, 100),
                color=categories.get(budget.category, "#64748B"),
                is_over_budget=is_over_budget
            ))
        
        return summary
    
    # ヘルパーメソッド
    def _is_expense_in_month(self, expense: Expense, year: int, month: int) -> bool:
        try:
            expense_date = datetime.strptime(expense.date, "%Y-%m-%d")
            return expense_date.year == year and expense_date.month == month
        except ValueError:
            return False
    
    def _is_expense_in_year(self, expense: Expense, year: int) -> bool:
        try:
            expense_date = datetime.strptime(expense.date, "%Y-%m-%d")
            return expense_date.year == year
        except ValueError:
            return False

# グローバルデータベースインスタンス
db = Database()