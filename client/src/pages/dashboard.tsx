import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, Wallet, PieChart, List, Search, Filter, Edit, Trash2 } from "lucide-react";
import AddExpenseModal from "@/components/modals/add-expense-modal";
import BudgetProgress from "@/components/charts/budget-progress";
import type { Expense, MonthlyReport, BudgetSummary } from "@shared/schema";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ja-JP');
};

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    "交通費": "bg-blue-100 text-blue-800",
    "食費": "bg-green-100 text-green-800", 
    "接待費": "bg-red-100 text-red-800",
    "オフィス用品": "bg-amber-100 text-amber-800",
    "その他": "bg-gray-100 text-gray-800",
  };
  return colors[category] || colors["その他"];
};

export default function Dashboard() {
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<"monthly" | "yearly">("monthly");
  const [searchTerm, setSearchTerm] = useState("");
  
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // Fetch monthly report
  const { data: monthlyReport, isLoading: reportLoading } = useQuery<MonthlyReport>({
    queryKey: [`/api/reports/monthly?year=${currentYear}&month=${currentMonth}`],
  });

  // Fetch recent expenses
  const { data: expenses = [], isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: [`/api/expenses?year=${currentYear}&month=${currentMonth}`],
  });

  // Filter expenses based on search
  const filteredExpenses = expenses.filter(expense =>
    expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.user.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (reportLoading) {
    return (
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  const previousMonthExpenses = monthlyReport?.totalExpenses ? monthlyReport.totalExpenses * 0.875 : 0;
  const expenseChange = previousMonthExpenses > 0 
    ? ((monthlyReport?.totalExpenses || 0) - previousMonthExpenses) / previousMonthExpenses * 100 
    : 0;

  return (
    <main className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">ダッシュボード</h2>
          <p className="text-gray-600">{currentYear}年{currentMonth}月</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={currentPeriod} onValueChange={(value: "monthly" | "yearly") => setCurrentPeriod(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">月次表示</SelectItem>
              <SelectItem value="yearly">年次表示</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowAddExpenseModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            支出を追加
          </Button>
        </div>
      </header>

      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">今月の支出</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatCurrency(monthlyReport?.totalExpenses || 0)}
                  </p>
                </div>
                <div className="bg-red-100 p-3 rounded-full">
                  <TrendingUp className="h-5 w-5 text-red-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-sm ${expenseChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {expenseChange >= 0 ? '+' : ''}{expenseChange.toFixed(1)}%
                </span>
                <span className="text-sm text-gray-600 ml-2">前月比</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">予算残高</p>
                  <p className="text-2xl font-bold text-success">
                    {formatCurrency((monthlyReport?.totalBudget || 0) - (monthlyReport?.totalExpenses || 0))}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <Wallet className="h-5 w-5 text-success" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-sm text-success">
                  {monthlyReport?.totalBudget ? 
                    (((monthlyReport.totalBudget - monthlyReport.totalExpenses) / monthlyReport.totalBudget) * 100).toFixed(1) : 0}%
                </span>
                <span className="text-sm text-gray-600 ml-2">残り</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">予算達成率</p>
                  <p className="text-2xl font-bold text-warning">
                    {monthlyReport?.budgetUtilization.toFixed(1) || 0}%
                  </p>
                </div>
                <div className="bg-amber-100 p-3 rounded-full">
                  <PieChart className="h-5 w-5 text-warning" />
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-warning h-2 rounded-full" 
                    style={{ width: `${Math.min(monthlyReport?.budgetUtilization || 0, 100)}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">今月の支出項目</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {monthlyReport?.expenseCount || 0}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <List className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-sm text-primary">+8</span>
                <span className="text-sm text-gray-600 ml-2">前月比</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Budget Overview */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>科目別予算比較</CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyReport?.categories ? (
                  <BudgetProgress categories={monthlyReport.categories} />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    予算データがありません
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>クイックアクション</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button className="w-full justify-between" onClick={() => setShowAddExpenseModal(true)}>
                  <span className="flex items-center">
                    <Plus className="mr-3 h-4 w-4" />
                    新規支出追加
                  </span>
                </Button>
                
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center">
                    <Calculator className="mr-3 h-4 w-4" />
                    予算設定
                  </span>
                </Button>
                
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center">
                    <BarChart3 className="mr-3 h-4 w-4" />
                    レポート生成
                  </span>
                </Button>
                
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center">
                    <FileSpreadsheet className="mr-3 h-4 w-4" />
                    CSVインポート
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Expenses */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>最近の支出</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="支出を検索..."
                    className="pl-10 w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="mr-1 h-4 w-4" />
                  フィルター
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {expensesLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? "検索条件に一致する支出がありません" : "支出データがありません"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日付</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">科目</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">説明</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">使用者</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">金額</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredExpenses.slice(0, 10).map((expense) => (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                          {formatDate(expense.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getCategoryColor(expense.category)}>
                            {expense.category}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-800">
                          {expense.description || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                          {expense.user}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 text-right">
                          {formatCurrency(expense.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 mr-2">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/80">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AddExpenseModal 
        open={showAddExpenseModal} 
        onOpenChange={setShowAddExpenseModal}
      />
    </main>
  );
}
