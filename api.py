from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import pandas as pd
import io
from datetime import datetime
import csv

from models import (
    Expense, Budget, Category, ExpenseCreate, BudgetCreate, CategoryCreate,
    MonthlyReport, BudgetSummary
)
from database import db

app = FastAPI(title="予算管理システム API", version="1.0.0")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 支出関連エンドポイント
@app.get("/api/expenses", response_model=List[Expense])
def get_expenses(year: Optional[int] = None, month: Optional[int] = None):
    """支出一覧取得"""
    return db.get_expenses(year, month)

@app.post("/api/expenses", response_model=Expense)
def create_expense(expense: ExpenseCreate):
    """支出作成"""
    return db.create_expense(expense)

@app.get("/api/expenses/{expense_id}", response_model=Expense)
def get_expense(expense_id: int):
    """支出詳細取得"""
    expense = db.get_expense(expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="支出が見つかりません")
    return expense

@app.put("/api/expenses/{expense_id}", response_model=Expense)
def update_expense(expense_id: int, expense: ExpenseCreate):
    """支出更新"""
    updated_expense = db.update_expense(expense_id, expense)
    if not updated_expense:
        raise HTTPException(status_code=404, detail="支出が見つかりません")
    return updated_expense

@app.delete("/api/expenses/{expense_id}")
def delete_expense(expense_id: int):
    """支出削除"""
    if not db.delete_expense(expense_id):
        raise HTTPException(status_code=404, detail="支出が見つかりません")
    return {"message": "支出が削除されました"}

# 予算関連エンドポイント
@app.get("/api/budgets", response_model=List[Budget])
def get_budgets(year: Optional[int] = None, month: Optional[int] = None):
    """予算一覧取得"""
    return db.get_budgets(year, month)

@app.post("/api/budgets", response_model=Budget)
def create_budget(budget: BudgetCreate):
    """予算作成"""
    return db.create_budget(budget)

@app.get("/api/budgets/{budget_id}", response_model=Budget)
def get_budget(budget_id: int):
    """予算詳細取得"""
    budget = db.get_budget(budget_id)
    if not budget:
        raise HTTPException(status_code=404, detail="予算が見つかりません")
    return budget

@app.put("/api/budgets/{budget_id}", response_model=Budget)
def update_budget(budget_id: int, budget: BudgetCreate):
    """予算更新"""
    updated_budget = db.update_budget(budget_id, budget)
    if not updated_budget:
        raise HTTPException(status_code=404, detail="予算が見つかりません")
    return updated_budget

@app.delete("/api/budgets/{budget_id}")
def delete_budget(budget_id: int):
    """予算削除"""
    if not db.delete_budget(budget_id):
        raise HTTPException(status_code=404, detail="予算が見つかりません")
    return {"message": "予算が削除されました"}

# カテゴリ関連エンドポイント
@app.get("/api/categories", response_model=List[Category])
def get_categories():
    """カテゴリ一覧取得"""
    return db.get_categories()

@app.post("/api/categories", response_model=Category)
def create_category(category: CategoryCreate):
    """カテゴリ作成"""
    return db.create_category(category)

# レポート関連エンドポイント
@app.get("/api/reports/monthly", response_model=MonthlyReport)
def get_monthly_report(year: int, month: int):
    """月次レポート取得"""
    return db.get_monthly_report(year, month)

@app.get("/api/reports/budget-summary", response_model=List[BudgetSummary])
def get_budget_summary(year: int, month: Optional[int] = None):
    """予算サマリ取得"""
    return db.get_budget_summary(year, month)

# CSVインポート
@app.post("/api/expenses/import")
async def import_expenses_csv(file: UploadFile = File(...)):
    """CSVファイルから支出データをインポート"""
    if not file.filename or not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="CSVファイルを選択してください")
    
    try:
        content = await file.read()
        df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        
        # 必要な列をチェック
        required_columns = ['日付', '科目', '金額', '使用者']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400, 
                detail=f"必要な列が見つかりません: {', '.join(missing_columns)}"
            )
        
        imported_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                expense_data = ExpenseCreate(
                    date=str(row['日付']),
                    category=str(row['科目']),
                    amount=int(row['金額']),
                    user=str(row['使用者']),
                    description=str(row.get('説明', '')) if pd.notna(row.get('説明')) else None
                )
                db.create_expense(expense_data)
                imported_count += 1
            except Exception as e:
                errors.append(f"行 {int(index) + 2}: {str(e)}")
        
        return {
            "message": f"{imported_count}件の支出データをインポートしました",
            "imported_count": imported_count,
            "errors": errors[:10]  # 最初の10個のエラーのみ返す
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSVファイルの処理に失敗しました: {str(e)}")

# CSVエクスポート
@app.get("/api/expenses/export")
def export_expenses_csv(year: Optional[int] = None, month: Optional[int] = None):
    """支出データをCSVでエクスポート"""
    expenses = db.get_expenses(year, month)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # ヘッダー
    writer.writerow(['日付', '科目', '金額', '使用者', '説明'])
    
    # データ
    for expense in expenses:
        writer.writerow([
            expense.date,
            expense.category,
            expense.amount,
            expense.user,
            expense.description or ''
        ])
    
    output.seek(0)
    
    # ファイル名生成
    filename = "expenses"
    if year and month:
        filename += f"-{year}-{month:02d}"
    elif year:
        filename += f"-{year}"
    filename += ".csv"
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),  # BOM付きUTF-8
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)