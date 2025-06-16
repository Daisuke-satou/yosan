import { pgTable, text, serial, integer, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  category: text("category").notNull(),
  amount: integer("amount").notNull(), // Store as cents to avoid decimal issues
  user: text("user").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  category: text("category").notNull().unique(),
  amount: integer("amount").notNull(), // Store as cents
  period: text("period").notNull().default("monthly"), // monthly, yearly
  year: integer("year").notNull(),
  month: integer("month"), // null for yearly budgets
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull(),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.number().min(1, "金額は1円以上である必要があります"),
});

export const insertBudgetSchema = createInsertSchema(budgets).omit({
  id: true,
}).extend({
  amount: z.number().min(1, "予算は1円以上である必要があります"),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Expense = typeof expenses.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type Category = typeof categories.$inferSelect;

// Helper types for frontend
export interface ExpenseWithFormatted extends Expense {
  formattedAmount: string;
}

export interface BudgetSummary {
  category: string;
  budget: number;
  used: number;
  remaining: number;
  percentage: number;
  color: string;
  isOverBudget: boolean;
}

export interface MonthlyReport {
  month: string;
  year: number;
  totalExpenses: number;
  totalBudget: number;
  budgetUtilization: number;
  categories: BudgetSummary[];
  expenseCount: number;
}
