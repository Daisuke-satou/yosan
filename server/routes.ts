import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertExpenseSchema, insertBudgetSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Expense routes
  app.get("/api/expenses", async (req, res) => {
    try {
      const { year, month } = req.query;
      let expenses;
      
      if (year && month) {
        expenses = await storage.getExpensesByMonth(Number(year), Number(month));
      } else if (year) {
        expenses = await storage.getExpensesByYear(Number(year));
      } else {
        expenses = await storage.getExpenses();
      }
      
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "支出データの取得に失敗しました" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const validatedData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(validatedData);
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "入力データが無効です", errors: error.errors });
      } else {
        res.status(500).json({ message: "支出の作成に失敗しました" });
      }
    }
  });

  app.put("/api/expenses/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const validatedData = insertExpenseSchema.partial().parse(req.body);
      const expense = await storage.updateExpense(id, validatedData);
      
      if (!expense) {
        return res.status(404).json({ message: "支出が見つかりません" });
      }
      
      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "入力データが無効です", errors: error.errors });
      } else {
        res.status(500).json({ message: "支出の更新に失敗しました" });
      }
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const deleted = await storage.deleteExpense(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "支出が見つかりません" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "支出の削除に失敗しました" });
    }
  });

  // Budget routes
  app.get("/api/budgets", async (req, res) => {
    try {
      const { year, month } = req.query;
      let budgets;
      
      if (year) {
        budgets = await storage.getBudgetsByPeriod(Number(year), month ? Number(month) : undefined);
      } else {
        budgets = await storage.getBudgets();
      }
      
      res.json(budgets);
    } catch (error) {
      res.status(500).json({ message: "予算データの取得に失敗しました" });
    }
  });

  app.post("/api/budgets", async (req, res) => {
    try {
      const validatedData = insertBudgetSchema.parse(req.body);
      const budget = await storage.createBudget(validatedData);
      res.status(201).json(budget);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "入力データが無効です", errors: error.errors });
      } else {
        res.status(500).json({ message: "予算の作成に失敗しました" });
      }
    }
  });

  app.put("/api/budgets/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const validatedData = insertBudgetSchema.partial().parse(req.body);
      const budget = await storage.updateBudget(id, validatedData);
      
      if (!budget) {
        return res.status(404).json({ message: "予算が見つかりません" });
      }
      
      res.json(budget);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "入力データが無効です", errors: error.errors });
      } else {
        res.status(500).json({ message: "予算の更新に失敗しました" });
      }
    }
  });

  app.delete("/api/budgets/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const deleted = await storage.deleteBudget(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "予算が見つかりません" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "予算の削除に失敗しました" });
    }
  });

  // Category routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "カテゴリの取得に失敗しました" });
    }
  });

  // Report routes
  app.get("/api/reports/monthly", async (req, res) => {
    try {
      const { year, month } = req.query;
      
      if (!year || !month) {
        return res.status(400).json({ message: "年と月のパラメータが必要です" });
      }
      
      const report = await storage.getMonthlyReport(Number(year), Number(month));
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "月次レポートの生成に失敗しました" });
    }
  });

  app.get("/api/reports/budget-summary", async (req, res) => {
    try {
      const { year, month } = req.query;
      
      if (!year) {
        return res.status(400).json({ message: "年のパラメータが必要です" });
      }
      
      const summary = await storage.getBudgetSummary(Number(year), month ? Number(month) : undefined);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "予算サマリの取得に失敗しました" });
    }
  });

  // CSV Export route
  app.get("/api/expenses/export", async (req, res) => {
    try {
      const { year, month } = req.query;
      let expenses;
      
      if (year && month) {
        expenses = await storage.getExpensesByMonth(Number(year), Number(month));
      } else if (year) {
        expenses = await storage.getExpensesByYear(Number(year));
      } else {
        expenses = await storage.getExpenses();
      }

      // Generate CSV content
      const csvHeader = "日付,科目,金額,使用者,説明\n";
      const csvContent = expenses.map(expense => 
        `${expense.date},${expense.category},${expense.amount},${expense.user},"${expense.description || ''}"`
      ).join("\n");

      const csv = csvHeader + csvContent;
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="expenses-${year || 'all'}-${month || 'all'}.csv"`);
      res.send("\uFEFF" + csv); // Add BOM for UTF-8
    } catch (error) {
      res.status(500).json({ message: "CSVエクスポートに失敗しました" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
