import { 
  expenses, 
  budgets, 
  categories,
  type Expense, 
  type Budget, 
  type Category,
  type InsertExpense, 
  type InsertBudget,
  type InsertCategory,
  type BudgetSummary,
  type MonthlyReport
} from "@shared/schema";

export interface IStorage {
  // Expense operations
  getExpenses(): Promise<Expense[]>;
  getExpensesByMonth(year: number, month: number): Promise<Expense[]>;
  getExpensesByYear(year: number): Promise<Expense[]>;
  getExpenseById(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<boolean>;
  
  // Budget operations  
  getBudgets(): Promise<Budget[]>;
  getBudgetsByPeriod(year: number, month?: number): Promise<Budget[]>;
  getBudgetByCategory(category: string, year: number, month?: number): Promise<Budget | undefined>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  updateBudget(id: number, budget: Partial<InsertBudget>): Promise<Budget | undefined>;
  deleteBudget(id: number): Promise<boolean>;
  
  // Category operations
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Report operations
  getMonthlyReport(year: number, month: number): Promise<MonthlyReport>;
  getBudgetSummary(year: number, month?: number): Promise<BudgetSummary[]>;
}

export class MemStorage implements IStorage {
  private expenses: Map<number, Expense>;
  private budgets: Map<number, Budget>;
  private categories: Map<number, Category>;
  private currentExpenseId: number;
  private currentBudgetId: number;
  private currentCategoryId: number;

  constructor() {
    this.expenses = new Map();
    this.budgets = new Map();
    this.categories = new Map();
    this.currentExpenseId = 1;
    this.currentBudgetId = 1;
    this.currentCategoryId = 1;
    
    // Initialize default categories
    this.initializeDefaultCategories();
  }

  private async initializeDefaultCategories() {
    const defaultCategories = [
      { name: "交通費", color: "#2563EB" },
      { name: "食費", color: "#10B981" },
      { name: "接待費", color: "#EF4444" },
      { name: "オフィス用品", color: "#F59E0B" },
      { name: "その他", color: "#64748B" },
    ];

    for (const category of defaultCategories) {
      await this.createCategory(category);
    }
  }

  // Expense operations
  async getExpenses(): Promise<Expense[]> {
    return Array.from(this.expenses.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async getExpensesByMonth(year: number, month: number): Promise<Expense[]> {
    return Array.from(this.expenses.values()).filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getFullYear() === year && expenseDate.getMonth() + 1 === month;
    });
  }

  async getExpensesByYear(year: number): Promise<Expense[]> {
    return Array.from(this.expenses.values()).filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getFullYear() === year;
    });
  }

  async getExpenseById(id: number): Promise<Expense | undefined> {
    return this.expenses.get(id);
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const id = this.currentExpenseId++;
    const expense: Expense = {
      ...insertExpense,
      id,
      createdAt: new Date(),
    };
    this.expenses.set(id, expense);
    return expense;
  }

  async updateExpense(id: number, update: Partial<InsertExpense>): Promise<Expense | undefined> {
    const expense = this.expenses.get(id);
    if (!expense) return undefined;
    
    const updatedExpense = { ...expense, ...update };
    this.expenses.set(id, updatedExpense);
    return updatedExpense;
  }

  async deleteExpense(id: number): Promise<boolean> {
    return this.expenses.delete(id);
  }

  // Budget operations
  async getBudgets(): Promise<Budget[]> {
    return Array.from(this.budgets.values());
  }

  async getBudgetsByPeriod(year: number, month?: number): Promise<Budget[]> {
    return Array.from(this.budgets.values()).filter(budget => {
      if (budget.period === "yearly") {
        return budget.year === year && !month;
      } else {
        return budget.year === year && budget.month === month;
      }
    });
  }

  async getBudgetByCategory(category: string, year: number, month?: number): Promise<Budget | undefined> {
    return Array.from(this.budgets.values()).find(budget => {
      if (budget.period === "yearly") {
        return budget.category === category && budget.year === year && !month;
      } else {
        return budget.category === category && budget.year === year && budget.month === month;
      }
    });
  }

  async createBudget(insertBudget: InsertBudget): Promise<Budget> {
    const id = this.currentBudgetId++;
    const budget: Budget = { ...insertBudget, id };
    this.budgets.set(id, budget);
    return budget;
  }

  async updateBudget(id: number, update: Partial<InsertBudget>): Promise<Budget | undefined> {
    const budget = this.budgets.get(id);
    if (!budget) return undefined;
    
    const updatedBudget = { ...budget, ...update };
    this.budgets.set(id, updatedBudget);
    return updatedBudget;
  }

  async deleteBudget(id: number): Promise<boolean> {
    return this.budgets.delete(id);
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = this.currentCategoryId++;
    const category: Category = { ...insertCategory, id };
    this.categories.set(id, category);
    return category;
  }

  // Report operations
  async getMonthlyReport(year: number, month: number): Promise<MonthlyReport> {
    const monthlyExpenses = await this.getExpensesByMonth(year, month);
    const budgetSummary = await this.getBudgetSummary(year, month);
    
    const totalExpenses = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalBudget = budgetSummary.reduce((sum, summary) => sum + summary.budget, 0);
    const budgetUtilization = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;

    return {
      month: `${year}年${month}月`,
      year,
      totalExpenses,
      totalBudget,
      budgetUtilization,
      categories: budgetSummary,
      expenseCount: monthlyExpenses.length,
    };
  }

  async getBudgetSummary(year: number, month?: number): Promise<BudgetSummary[]> {
    const budgets = await this.getBudgetsByPeriod(year, month);
    const expenses = month 
      ? await this.getExpensesByMonth(year, month)
      : await this.getExpensesByYear(year);
    const categories = await this.getCategories();

    const categoryMap = new Map(categories.map(cat => [cat.name, cat.color]));

    return budgets.map(budget => {
      const categoryExpenses = expenses
        .filter(expense => expense.category === budget.category)
        .reduce((sum, expense) => sum + expense.amount, 0);

      const remaining = budget.amount - categoryExpenses;
      const percentage = budget.amount > 0 ? (categoryExpenses / budget.amount) * 100 : 0;
      const isOverBudget = categoryExpenses > budget.amount;

      return {
        category: budget.category,
        budget: budget.amount,
        used: categoryExpenses,
        remaining,
        percentage: Math.min(percentage, 100),
        color: categoryMap.get(budget.category) || "#64748B",
        isOverBudget,
      };
    });
  }
}

export const storage = new MemStorage();
