#!/usr/bin/env python3
"""
簡易版予算管理システム - Streamlitのみで動作
"""

import streamlit as st
import pandas as pd
from datetime import datetime, date
import json
import os
from typing import List, Dict, Any

# ページ設定
st.set_page_config(
    page_title="予算管理システム",
    page_icon="💰",
    layout="wide",
    initial_sidebar_state="expanded"
)

# データファイルパス
DATA_FILE = "budget_data.json"

# データ構造
def load_data():
    """データを読み込む"""
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    else:
        return {
            "expenses": [],
            "budgets": [],
            "categories": [
                {"id": 1, "name": "交通費", "color": "#2563EB"},
                {"id": 2, "name": "食費", "color": "#10B981"},
                {"id": 3, "name": "接待費", "color": "#EF4444"},
                {"id": 4, "name": "オフィス用品", "color": "#F59E0B"},
                {"id": 5, "name": "その他", "color": "#64748B"},
            ],
            "next_expense_id": 1,
            "next_budget_id": 1,
            "next_category_id": 6
        }

def save_data(data):
    """データを保存する"""
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def format_currency(amount: int) -> str:
    """金額を日本円形式でフォーマット"""
    return f"¥{amount:,}"

def get_expenses_by_period(data, year: int, month: int = None) -> List[Dict]:
    """期間で支出をフィルタ"""
    expenses = []
    for expense in data["expenses"]:
        expense_date = datetime.strptime(expense["date"], "%Y-%m-%d")
        if expense_date.year == year:
            if month is None or expense_date.month == month:
                expenses.append(expense)
    return sorted(expenses, key=lambda x: x["date"], reverse=True)

def get_budgets_by_period(data, year: int, month: int = None) -> List[Dict]:
    """期間で予算をフィルタ"""
    budgets = []
    for budget in data["budgets"]:
        if budget["year"] == year:
            if budget["period"] == "yearly" and month is None:
                budgets.append(budget)
            elif budget["period"] == "monthly" and budget.get("month") == month:
                budgets.append(budget)
    return budgets

def calculate_budget_summary(data, year: int, month: int = None) -> List[Dict]:
    """予算サマリを計算"""
    budgets = get_budgets_by_period(data, year, month)
    expenses = get_expenses_by_period(data, year, month)
    
    categories = {cat["name"]: cat["color"] for cat in data["categories"]}
    
    summary = []
    for budget in budgets:
        category_expenses = sum(
            exp["amount"] for exp in expenses if exp["category"] == budget["category"]
        )
        
        remaining = budget["amount"] - category_expenses
        percentage = (category_expenses / budget["amount"] * 100) if budget["amount"] > 0 else 0
        is_over_budget = category_expenses > budget["amount"]
        
        summary.append({
            "category": budget["category"],
            "budget": budget["amount"],
            "used": category_expenses,
            "remaining": remaining,
            "percentage": min(percentage, 100),
            "color": categories.get(budget["category"], "#64748B"),
            "is_over_budget": is_over_budget
        })
    
    return summary

# セッション状態の初期化
if 'data' not in st.session_state:
    st.session_state.data = load_data()
if 'current_year' not in st.session_state:
    st.session_state.current_year = datetime.now().year
if 'current_month' not in st.session_state:
    st.session_state.current_month = datetime.now().month

# サイドバー
with st.sidebar:
    st.title("💰 予算管理システム")
    
    # ナビゲーション
    page = st.selectbox(
        "ページ選択",
        ["ダッシュボード", "支出管理", "予算設定", "照合レポート", "データ管理"],
        key="page_selector"
    )
    
    st.divider()
    
    # 期間選択
    st.subheader("期間設定")
    col1, col2 = st.columns(2)
    with col1:
        st.session_state.current_year = st.selectbox(
            "年",
            range(datetime.now().year - 2, datetime.now().year + 3),
            index=2,
            key="year_selector"
        )
    with col2:
        st.session_state.current_month = st.selectbox(
            "月",
            range(1, 13),
            index=datetime.now().month - 1,
            key="month_selector"
        )

# メインコンテンツ
if page == "ダッシュボード":
    st.title("📊 ダッシュボード")
    st.subheader(f"{st.session_state.current_year}年{st.session_state.current_month}月")
    
    # データ取得
    expenses = get_expenses_by_period(st.session_state.data, st.session_state.current_year, st.session_state.current_month)
    budget_summary = calculate_budget_summary(st.session_state.data, st.session_state.current_year, st.session_state.current_month)
    
    total_expenses = sum(exp["amount"] for exp in expenses)
    total_budget = sum(summary["budget"] for summary in budget_summary)
    budget_utilization = (total_expenses / total_budget * 100) if total_budget > 0 else 0
    
    # サマリーカード
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("今月の支出", format_currency(total_expenses))
    
    with col2:
        remaining = total_budget - total_expenses
        st.metric("予算残高", format_currency(remaining))
    
    with col3:
        st.metric("予算達成率", f"{budget_utilization:.1f}%")
    
    with col4:
        st.metric("支出件数", f"{len(expenses)}件")
    
    st.divider()
    
    # 予算進捗
    if budget_summary:
        st.subheader("科目別予算進捗")
        
        for summary in budget_summary:
            col1, col2, col3 = st.columns([2, 1, 1])
            
            with col1:
                st.write(f"**{summary['category']}**")
                progress_value = min(summary['percentage'] / 100, 1.0)
                st.progress(progress_value)
                
            with col2:
                st.metric("予算", format_currency(summary['budget']))
                
            with col3:
                st.metric("使用済み", format_currency(summary['used']))
    
    # 最近の支出
    st.subheader("最近の支出")
    if expenses:
        df_expenses = pd.DataFrame(expenses)
        df_expenses['amount_formatted'] = df_expenses['amount'].apply(format_currency)
        
        st.dataframe(
            df_expenses[['date', 'category', 'user', 'amount_formatted', 'description']],
            column_config={
                'date': '日付',
                'category': '科目',
                'user': '使用者',
                'amount_formatted': '金額',
                'description': '説明'
            },
            hide_index=True
        )
    else:
        st.info("支出データがありません")

elif page == "支出管理":
    st.title("💸 支出管理")
    
    # 支出追加フォーム
    with st.expander("新規支出追加", expanded=False):
        with st.form("expense_form"):
            col1, col2 = st.columns(2)
            
            with col1:
                expense_date = st.date_input("日付", value=date.today())
                category_names = [cat['name'] for cat in st.session_state.data['categories']]
                expense_category = st.selectbox("科目", category_names)
                
            with col2:
                expense_amount = st.number_input("金額", min_value=1, value=1000)
                expense_user = st.text_input("使用者")
                
            expense_description = st.text_area("説明（任意）")
            
            if st.form_submit_button("支出を追加"):
                new_expense = {
                    "id": st.session_state.data["next_expense_id"],
                    "date": expense_date.strftime("%Y-%m-%d"),
                    "category": expense_category,
                    "amount": expense_amount,
                    "user": expense_user,
                    "description": expense_description if expense_description else None,
                    "created_at": datetime.now().isoformat()
                }
                
                st.session_state.data["expenses"].append(new_expense)
                st.session_state.data["next_expense_id"] += 1
                save_data(st.session_state.data)
                
                st.success("支出が追加されました！")
                st.rerun()
    
    # 支出一覧
    st.subheader(f"{st.session_state.current_year}年{st.session_state.current_month}月の支出一覧")
    
    expenses = get_expenses_by_period(st.session_state.data, st.session_state.current_year, st.session_state.current_month)
    
    if expenses:
        df_expenses = pd.DataFrame(expenses)
        df_expenses['amount_formatted'] = df_expenses['amount'].apply(format_currency)
        
        # 検索機能
        search_term = st.text_input("検索（説明、科目、使用者）")
        if search_term:
            df_expenses = df_expenses[
                df_expenses['description'].fillna('').str.contains(search_term, case=False) |
                df_expenses['category'].str.contains(search_term, case=False) |
                df_expenses['user'].str.contains(search_term, case=False)
            ]
        
        st.dataframe(
            df_expenses[['date', 'category', 'user', 'amount_formatted', 'description']],
            column_config={
                'date': '日付',
                'category': '科目',
                'user': '使用者',
                'amount_formatted': '金額',
                'description': '説明'
            },
            hide_index=True,
            use_container_width=True
        )
        
        total_amount = df_expenses['amount'].sum()
        st.metric("期間合計", format_currency(total_amount))
        
    else:
        st.info("支出データがありません")

elif page == "予算設定":
    st.title("📊 予算設定")
    
    # 予算追加フォーム
    with st.expander("新規予算設定", expanded=False):
        with st.form("budget_form"):
            col1, col2 = st.columns(2)
            
            with col1:
                category_names = [cat['name'] for cat in st.session_state.data['categories']]
                budget_category = st.selectbox("科目", category_names)
                budget_amount = st.number_input("予算金額", min_value=1, value=50000)
                
            with col2:
                budget_period = st.selectbox("期間", ["monthly", "yearly"])
                budget_year = st.number_input("年", min_value=2020, max_value=2030, value=st.session_state.current_year)
                
            budget_month = None
            if budget_period == "monthly":
                budget_month = st.selectbox("月", range(1, 13), index=st.session_state.current_month - 1)
            
            if st.form_submit_button("予算を設定"):
                new_budget = {
                    "id": st.session_state.data["next_budget_id"],
                    "category": budget_category,
                    "amount": budget_amount,
                    "period": budget_period,
                    "year": budget_year,
                    "month": budget_month if budget_period == "monthly" else None
                }
                
                st.session_state.data["budgets"].append(new_budget)
                st.session_state.data["next_budget_id"] += 1
                save_data(st.session_state.data)
                
                st.success("予算が設定されました！")
                st.rerun()
    
    # 予算一覧
    period_type = st.selectbox("表示期間", ["月次", "年次"])
    
    if period_type == "月次":
        budgets = get_budgets_by_period(st.session_state.data, st.session_state.current_year, st.session_state.current_month)
        budget_summary = calculate_budget_summary(st.session_state.data, st.session_state.current_year, st.session_state.current_month)
    else:
        budgets = get_budgets_by_period(st.session_state.data, st.session_state.current_year)
        budget_summary = calculate_budget_summary(st.session_state.data, st.session_state.current_year)
    
    if budget_summary:
        st.subheader("予算達成状況")
        
        for summary in budget_summary:
            col1, col2, col3 = st.columns([2, 1, 1])
            
            with col1:
                st.write(f"**{summary['category']}**")
                progress_value = min(summary['percentage'] / 100, 1.0)
                st.progress(progress_value)
                
            with col2:
                st.metric("予算", format_currency(summary['budget']))
                
            with col3:
                st.metric("使用済み", format_currency(summary['used']))
    
    if budgets:
        st.subheader("予算設定一覧")
        df_budgets = pd.DataFrame(budgets)
        df_budgets['amount_formatted'] = df_budgets['amount'].apply(format_currency)
        df_budgets['period_display'] = df_budgets.apply(
            lambda x: f"{x['month']}月" if x['period'] == 'monthly' and x['month'] else "年間", axis=1
        )
        
        st.dataframe(
            df_budgets[['category', 'amount_formatted', 'period_display', 'year']],
            column_config={
                'category': '科目',
                'amount_formatted': '予算金額',
                'period_display': '期間',
                'year': '年'
            },
            hide_index=True,
            use_container_width=True
        )

elif page == "照合レポート":
    st.title("📈 照合レポート")
    
    # データ取得
    expenses = get_expenses_by_period(st.session_state.data, st.session_state.current_year, st.session_state.current_month)
    budget_summary = calculate_budget_summary(st.session_state.data, st.session_state.current_year, st.session_state.current_month)
    
    total_expenses = sum(exp["amount"] for exp in expenses)
    total_budget = sum(summary["budget"] for summary in budget_summary)
    budget_utilization = (total_expenses / total_budget * 100) if total_budget > 0 else 0
    
    # サマリー表示
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("総支出額", format_currency(total_expenses))
    with col2:
        st.metric("総予算額", format_currency(total_budget))
    with col3:
        st.metric("予算達成率", f"{budget_utilization:.1f}%")
    with col4:
        st.metric("支出件数", f"{len(expenses)}件")
    
    st.divider()
    
    # 詳細分析
    if budget_summary:
        st.subheader("予算実績対比表")
        
        df_analysis = pd.DataFrame(budget_summary)
        df_analysis['budget_formatted'] = df_analysis['budget'].apply(format_currency)
        df_analysis['used_formatted'] = df_analysis['used'].apply(format_currency)
        df_analysis['remaining_formatted'] = df_analysis['remaining'].apply(format_currency)
        df_analysis['status'] = df_analysis['is_over_budget'].apply(
            lambda x: "⚠️ 予算超過" if x else "✅ 正常"
        )
        
        st.dataframe(
            df_analysis[['category', 'budget_formatted', 'used_formatted', 'remaining_formatted', 'percentage', 'status']],
            column_config={
                'category': '科目',
                'budget_formatted': '予算額',
                'used_formatted': '実績額',
                'remaining_formatted': '差額',
                'percentage': st.column_config.ProgressColumn('達成率', min_value=0, max_value=100),
                'status': '状態'
            },
            hide_index=True,
            use_container_width=True
        )

elif page == "データ管理":
    st.title("📁 データ管理")
    
    # CSVエクスポート
    st.subheader("CSVエクスポート")
    
    expenses = get_expenses_by_period(st.session_state.data, st.session_state.current_year, st.session_state.current_month)
    
    if expenses:
        df_export = pd.DataFrame(expenses)
        csv = df_export.to_csv(index=False, encoding='utf-8-sig')
        
        st.download_button(
            label="今月のデータをCSVでダウンロード",
            data=csv,
            file_name=f"expenses-{st.session_state.current_year}-{st.session_state.current_month:02d}.csv",
            mime="text/csv"
        )
    
    st.divider()
    
    # データ管理
    st.subheader("データ管理")
    
    if st.button("全データをリセット", type="secondary"):
        if st.checkbox("本当にすべてのデータを削除しますか？"):
            st.session_state.data = {
                "expenses": [],
                "budgets": [],
                "categories": [
                    {"id": 1, "name": "交通費", "color": "#2563EB"},
                    {"id": 2, "name": "食費", "color": "#10B981"},
                    {"id": 3, "name": "接待費", "color": "#EF4444"},
                    {"id": 4, "name": "オフィス用品", "color": "#F59E0B"},
                    {"id": 5, "name": "その他", "color": "#64748B"},
                ],
                "next_expense_id": 1,
                "next_budget_id": 1,
                "next_category_id": 6
            }
            save_data(st.session_state.data)
            st.success("データがリセットされました")
            st.rerun()

# フッター
st.divider()
st.caption("予算管理システム - Python版 (Streamlit)")