import { Progress } from "@/components/ui/progress";
import type { BudgetSummary } from "@shared/schema";

interface BudgetProgressProps {
  categories: BudgetSummary[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(amount);
};

export default function BudgetProgress({ categories }: BudgetProgressProps) {
  if (!categories.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        予算データがありません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {categories.map((category) => (
        <div 
          key={category.category}
          className={`flex items-center justify-between p-4 rounded-lg ${
            category.isOverBudget 
              ? 'bg-red-50 border border-red-200' 
              : 'bg-gray-50'
          }`}
        >
          <div className="flex items-center">
            <div 
              className="w-3 h-3 rounded-full mr-3"
              style={{ backgroundColor: category.color }}
            ></div>
            <span className="font-medium text-gray-800">{category.category}</span>
          </div>
          <div className="text-right flex-1 ml-4">
            <div className="flex items-center justify-end space-x-4 mb-2">
              <span className="text-sm text-gray-600">
                予算: {formatCurrency(category.budget)}
              </span>
              <span className={`text-sm font-medium ${
                category.isOverBudget ? 'text-red-600' : 'text-gray-800'
              }`}>
                使用: {formatCurrency(category.used)}
              </span>
              <span className={`text-sm ${
                category.isOverBudget ? 'text-red-600' : 'text-success'
              }`}>
                {category.isOverBudget ? '-' : ''}{formatCurrency(Math.abs(category.remaining))}
              </span>
            </div>
            <div className="w-32">
              <Progress 
                value={category.percentage} 
                className={`h-2 ${
                  category.isOverBudget ? '[&>div]:bg-red-500' : `[&>div]:bg-[${category.color}]`
                }`}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
