import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BudgetProgress from "@/components/charts/budget-progress";
import { Download, FileText, PieChart } from "lucide-react";
import type { MonthlyReport } from "@shared/schema";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(amount);
};

export default function Reports() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  
  // Fetch monthly report
  const { data: monthlyReport, isLoading } = useQuery<MonthlyReport>({
    queryKey: [`/api/reports/monthly?year=${selectedYear}&month=${selectedMonth}`],
  });

  const handleExportCSV = () => {
    const url = `/api/expenses/export?year=${selectedYear}&month=${selectedMonth}`;
    window.open(url, '_blank');
  };

  return (
    <main className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">照合レポート</h2>
            <p className="text-gray-600">{selectedYear}年{selectedMonth}月の月次照合レポート</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              CSVエクスポート
            </Button>
            <Button>
              <FileText className="mr-2 h-4 w-4" />
              レポート印刷
            </Button>
          </div>
        </div>

        {/* Period Selection */}
        <div className="flex items-center space-x-4 mt-4">
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
        </div>
      </header>

      <div className="p-6">
        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded-xl animate-pulse"></div>
          </div>
        ) : !monthlyReport ? (
          <div className="text-center py-12">
            <PieChart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">レポートデータがありません</h3>
            <p className="text-gray-600">選択した期間にデータが存在しません。</p>
          </div>
        ) : (
          <>
            {/* Report Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">総支出額</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {formatCurrency(monthlyReport.totalExpenses)}
                      </p>
                    </div>
                    <div className="bg-red-100 p-3 rounded-full">
                      <FileText className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">総予算額</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {formatCurrency(monthlyReport.totalBudget)}
                      </p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-full">
                      <PieChart className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">予算達成率</p>
                      <p className={`text-2xl font-bold ${
                        monthlyReport.budgetUtilization > 100 ? 'text-red-600' : 'text-gray-800'
                      }`}>
                        {monthlyReport.budgetUtilization.toFixed(1)}%
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${
                      monthlyReport.budgetUtilization > 100 ? 'bg-red-100' : 'bg-green-100'
                    }`}>
                      <PieChart className={`h-5 w-5 ${
                        monthlyReport.budgetUtilization > 100 ? 'text-red-600' : 'text-success'
                      }`} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">支出件数</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {monthlyReport.expenseCount}
                      </p>
                    </div>
                    <div className="bg-amber-100 p-3 rounded-full">
                      <FileText className="h-5 w-5 text-warning" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Budget Analysis */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>科目別予算分析</CardTitle>
              </CardHeader>
              <CardContent>
                <BudgetProgress categories={monthlyReport.categories} />
              </CardContent>
            </Card>

            {/* Budget vs Actual Summary */}
            <Card>
              <CardHeader>
                <CardTitle>予算実績対比表</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">科目</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">予算額</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">実績額</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">差額</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">達成率</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">状態</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {monthlyReport.categories.map((category) => (
                        <tr key={category.category} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div 
                                className="w-3 h-3 rounded-full mr-3"
                                style={{ backgroundColor: category.color }}
                              ></div>
                              <span className="font-medium text-gray-800">{category.category}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right">
                            {formatCurrency(category.budget)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right">
                            {formatCurrency(category.used)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                            category.isOverBudget ? 'text-red-600' : 'text-success'
                          }`}>
                            {category.isOverBudget ? '-' : ''}{formatCurrency(Math.abs(category.remaining))}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                            category.percentage > 100 ? 'text-red-600' : 'text-gray-800'
                          }`}>
                            {category.percentage.toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              category.isOverBudget 
                                ? 'bg-red-100 text-red-800' 
                                : category.percentage > 80 
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                            }`}>
                              {category.isOverBudget ? '予算超過' : category.percentage > 80 ? '注意' : '正常'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
