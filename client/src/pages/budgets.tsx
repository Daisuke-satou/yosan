import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AddBudgetModal from "@/components/modals/add-budget-modal";
import BudgetProgress from "@/components/charts/budget-progress";
import { Plus, Edit, Trash2 } from "lucide-react";
import type { Budget, BudgetSummary } from "@shared/schema";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(amount);
};

export default function Budgets() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [periodType, setPeriodType] = useState<"monthly" | "yearly">("monthly");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch budgets
  const { data: budgets = [], isLoading: budgetsLoading } = useQuery<Budget[]>({
    queryKey: [`/api/budgets?year=${selectedYear}${periodType === 'monthly' ? `&month=${selectedMonth}` : ''}`],
  });

  // Fetch budget summary
  const { data: budgetSummary = [], isLoading: summaryLoading } = useQuery<BudgetSummary[]>({
    queryKey: [`/api/reports/budget-summary?year=${selectedYear}${periodType === 'monthly' ? `&month=${selectedMonth}` : ''}`],
  });

  // Delete budget mutation
  const deleteBudgetMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/budgets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      toast({
        title: "成功",
        description: "予算が削除されました",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "予算の削除に失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleDeleteBudget = (id: number) => {
    if (window.confirm("この予算を削除してもよろしいですか？")) {
      deleteBudgetMutation.mutate(id);
    }
  };

  const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0);
  const totalUsed = budgetSummary.reduce((sum, summary) => sum + summary.used, 0);

  return (
    <main className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">予算設定</h2>
            <p className="text-gray-600">
              {periodType === 'monthly' ? `${selectedYear}年${selectedMonth}月の予算` : `${selectedYear}年の予算`}
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            予算を追加
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4 mt-4">
          <Select value={periodType} onValueChange={(value: "monthly" | "yearly") => setPeriodType(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">月次予算</SelectItem>
              <SelectItem value="yearly">年次予算</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return (
                  <SelectItem key={year} value={year.toString()}>
                    {year}年
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {periodType === "monthly" && (
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <SelectItem key={month} value={month.toString()}>
                    {month}月
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </header>

      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">総予算</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatCurrency(totalBudget)}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">使用済み</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatCurrency(totalUsed)}
                  </p>
                </div>
                <div className="bg-red-100 p-3 rounded-full">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">残り予算</p>
                  <p className="text-2xl font-bold text-success">
                    {formatCurrency(totalBudget - totalUsed)}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <Edit className="h-5 w-5 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Budget Progress */}
          <Card>
            <CardHeader>
              <CardTitle>予算達成状況</CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : budgetSummary.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  予算データがありません
                </div>
              ) : (
                <BudgetProgress categories={budgetSummary} />
              )}
            </CardContent>
          </Card>

          {/* Budget Settings Table */}
          <Card>
            <CardHeader>
              <CardTitle>予算設定一覧</CardTitle>
            </CardHeader>
            <CardContent>
              {budgetsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : budgets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  設定された予算がありません
                </div>
              ) : (
                <div className="space-y-3">
                  {budgets.map((budget) => (
                    <div key={budget.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-800">{budget.category}</p>
                        <p className="text-sm text-gray-600">
                          {budget.period === 'monthly' ? `${budget.month}月` : '年間'} - {budget.year}年
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-lg font-semibold text-gray-800">
                          {formatCurrency(budget.amount)}
                        </span>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:text-destructive/80"
                            onClick={() => handleDeleteBudget(budget.id)}
                            disabled={deleteBudgetMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AddBudgetModal 
        open={showAddModal} 
        onOpenChange={setShowAddModal}
      />
    </main>
  );
}
