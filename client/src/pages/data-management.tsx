import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { parseCsvFile } from "@/lib/csv-utils";
import { Upload, Download, FileSpreadsheet, Database } from "lucide-react";
import type { InsertExpense } from "@shared/schema";

export default function DataManagement() {
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const importExpensesMutation = useMutation({
    mutationFn: async (expenses: InsertExpense[]) => {
      // Import expenses one by one
      const results = [];
      for (const expense of expenses) {
        try {
          const response = await apiRequest('POST', '/api/expenses', expense);
          results.push(await response.json());
        } catch (error) {
          console.error('Failed to import expense:', expense, error);
          throw error;
        }
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      toast({
        title: "インポート完了",
        description: `${results.length}件の支出データをインポートしました`,
      });
      setIsImporting(false);
    },
    onError: (error: any) => {
      toast({
        title: "インポートエラー",
        description: error.message || "データのインポートに失敗しました",
        variant: "destructive",
      });
      setIsImporting(false);
    },
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "ファイル形式エラー",
        description: "CSVファイルを選択してください",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);

    try {
      const expenses = await parseCsvFile(file);
      if (expenses.length === 0) {
        toast({
          title: "データなし",
          description: "インポート可能なデータが見つかりませんでした",
          variant: "destructive",
        });
        setIsImporting(false);
        return;
      }

      importExpensesMutation.mutate(expenses);
    } catch (error: any) {
      toast({
        title: "ファイル読み込みエラー",
        description: error.message || "CSVファイルの読み込みに失敗しました",
        variant: "destructive",
      });
      setIsImporting(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportCurrentMonth = () => {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const url = `/api/expenses/export?year=${year}&month=${month}`;
    window.open(url, '_blank');
  };

  const handleExportAll = () => {
    const url = '/api/expenses/export';
    window.open(url, '_blank');
  };

  return (
    <main className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">データ管理</h2>
          <p className="text-gray-600">CSVファイルのインポート・エクスポート機能</p>
        </div>
      </header>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CSV Import */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="mr-2 h-5 w-5" />
                CSVインポート
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="csv-file">CSVファイルを選択</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    disabled={isImporting}
                    className="mt-2"
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">CSVファイル形式</h4>
                  <p className="text-sm text-blue-700 mb-2">以下の列が必要です：</p>
                  <code className="text-xs bg-white p-2 rounded block text-blue-800">
                    日付,科目,金額,使用者,説明
                  </code>
                  <p className="text-xs text-blue-600 mt-2">
                    例: 2024-12-15,交通費,340,田中太郎,電車代
                  </p>
                </div>

                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="w-full"
                >
                  {isImporting ? (
                    "インポート中..."
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      ファイルを選択してインポート
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* CSV Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Download className="mr-2 h-5 w-5" />
                CSVエクスポート
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">エクスポート可能なデータ</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• 支出データ（日付、科目、金額、使用者、説明）</li>
                    <li>• 期間指定でのフィルタリング</li>
                    <li>• Excel対応のUTF-8形式</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <Button 
                    onClick={handleExportCurrentMonth}
                    variant="outline"
                    className="w-full"
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    今月のデータをエクスポート
                  </Button>

                  <Button 
                    onClick={handleExportAll}
                    variant="outline"
                    className="w-full"
                  >
                    <Database className="mr-2 h-4 w-4" />
                    全データをエクスポート
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Usage Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>使用方法</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-800 mb-3">インポート手順</h4>
                <ol className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start">
                    <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">1</span>
                    指定された形式でCSVファイルを準備
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">2</span>
                    「ファイルを選択してインポート」をクリック
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">3</span>
                    インポート完了を待つ
                  </li>
                </ol>
              </div>

              <div>
                <h4 className="font-medium text-gray-800 mb-3">エクスポート手順</h4>
                <ol className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start">
                    <span className="bg-success text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">1</span>
                    エクスポートする期間を選択
                  </li>
                  <li className="flex items-start">
                    <span className="bg-success text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">2</span>
                    該当するエクスポートボタンをクリック
                  </li>
                  <li className="flex items-start">
                    <span className="bg-success text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">3</span>
                    ダウンロードされたCSVファイルを確認
                  </li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
