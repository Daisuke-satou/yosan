import streamlit as st
import pandas as pd
import requests
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, date
import io
import json
from typing import List, Dict, Any

# ページ設定
st.set_page_config(
    page_title="予算管理システム",
    page_icon="💰",
    layout="wide",
    initial_sidebar_state="expanded"
)

# APIベースURL
API_BASE = "http://localhost:8000"

# セッション状態の初期化
if 'current_year' not in st.session_state:
    st.session_state.current_year = datetime.now().year
if 'current_month' not in st.session_state:
    st.session_state.current_month = datetime.now().month

# ユーティリティ関数
def format_currency(amount: int) -> str:
    """金額を日本円形式でフォーマット"""
    return f"¥{amount:,}"

def api_request(method: str, endpoint: str, data: Dict = None, params: Dict = None) -> Any:
    """API リクエストを送信"""
    url = f"{API_BASE}{endpoint}"
    try:
        if method == "GET":
            response = requests.get(url, params=params)
        elif method == "POST":
            response = requests.post(url, json=data)
        elif method == "PUT":
            response = requests.put(url, json=data)
        elif method == "DELETE":
            response = requests.delete(url)
        
        response.raise_for_status()
        return response.json() if response.content else None
    except requests.exceptions.ConnectionError:
        st.error("APIサーバーに接続できません。サーバーが起動していることを確認してください。")
        return None
    except requests.exceptions.RequestException as e:
        st.error(f"APIエラー: {str(e)}")
        return None

def get_categories() -> List[Dict]:
    """カテゴリ一覧を取得"""
    categories = api_request("GET", "/api/categories")
    return categories if categories else []

def get_expenses(year: int = None, month: int = None) -> List[Dict]:
    """支出一覧を取得"""
    params = {}
    if year:
        params['year'] = year
    if month:
        params['month'] = month
    
    expenses = api_request("GET", "/api/expenses", params=params)
    return expenses if expenses else []

def get_budgets(year: int = None, month: int = None) -> List[Dict]:
    """予算一覧を取得"""
    params = {}
    if year:
        params['year'] = year
    if month:
        params['month'] = month
    
    budgets = api_request("GET", "/api/budgets", params=params)
    return budgets if budgets else []

def get_monthly_report(year: int, month: int) -> Dict:
    """月次レポートを取得"""
    params = {'year': year, 'month': month}
    report = api_request("GET", "/api/reports/monthly", params=params)
    return report if report else {}

def get_budget_summary(year: int, month: int = None) -> List[Dict]:
    """予算サマリを取得"""
    params = {'year': year}
    if month:
        params['month'] = month
    
    summary = api_request("GET", "/api/reports/budget-summary", params=params)
    return summary if summary else []

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
    
    # 月次レポート取得
    report = get_monthly_report(st.session_state.current_year, st.session_state.current_month)
    
    if report:
        # サマリーカード
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric(
                "今月の支出",
                format_currency(report['total_expenses']),
                delta=None
            )
        
        with col2:
            remaining = report['total_budget'] - report['total_expenses']
            st.metric(
                "予算残高",
                format_currency(remaining),
                delta=None
            )
        
        with col3:
            st.metric(
                "予算達成率",
                f"{report['budget_utilization']:.1f}%",
                delta=None
            )
        
        with col4:
            st.metric(
                "支出件数",
                f"{report['expense_count']}件",
                delta=None
            )
        
        st.divider()
        
        # 予算進捗チャート
        if report['categories']:
            st.subheader("科目別予算進捗")
            
            df_budget = pd.DataFrame(report['categories'])
            
            # 横棒グラフ
            fig = go.Figure()
            
            for _, row in df_budget.iterrows():
                # 予算バー
                fig.add_trace(go.Bar(
                    y=[row['category']],
                    x=[row['budget']],
                    name='予算',
                    orientation='h',
                    marker_color='lightblue',
                    showlegend=False
                ))
                
                # 使用済みバー
                color = 'red' if row['is_over_budget'] else 'green'
                fig.add_trace(go.Bar(
                    y=[row['category']],
                    x=[row['used']],
                    name='使用済み',
                    orientation='h',
                    marker_color=color,
                    showlegend=False
                ))
            
            fig.update_layout(
                title="予算 vs 実績",
                xaxis_title="金額（円）",
                height=400,
                barmode='overlay'
            )
            
            st.plotly_chart(fig, use_container_width=True)
        
        # 最近の支出
        st.subheader("最近の支出")
        expenses = get_expenses(st.session_state.current_year, st.session_state.current_month)
        
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
    else:
        st.warning("レポートデータを取得できませんでした")

elif page == "支出管理":
    st.title("💸 支出管理")
    
    # 支出追加フォーム
    with st.expander("新規支出追加", expanded=False):
        with st.form("expense_form"):
            col1, col2 = st.columns(2)
            
            with col1:
                expense_date = st.date_input("日付", value=date.today())
                categories = get_categories()
                category_names = [cat['name'] for cat in categories]
                expense_category = st.selectbox("科目", category_names)
                
            with col2:
                expense_amount = st.number_input("金額", min_value=1, value=1000)
                expense_user = st.text_input("使用者")
                
            expense_description = st.text_area("説明（任意）")
            
            if st.form_submit_button("支出を追加"):
                expense_data = {
                    "date": expense_date.strftime("%Y-%m-%d"),
                    "category": expense_category,
                    "amount": expense_amount,
                    "user": expense_user,
                    "description": expense_description if expense_description else None
                }
                
                result = api_request("POST", "/api/expenses", data=expense_data)
                if result:
                    st.success("支出が追加されました！")
                    st.rerun()
    
    # 支出一覧
    st.subheader(f"{st.session_state.current_year}年{st.session_state.current_month}月の支出一覧")
    
    expenses = get_expenses(st.session_state.current_year, st.session_state.current_month)
    
    if expenses:
        df_expenses = pd.DataFrame(expenses)
        df_expenses['amount_formatted'] = df_expenses['amount'].apply(format_currency)
        
        # 検索・フィルター
        search_term = st.text_input("検索（説明、科目、使用者）")
        if search_term:
            df_expenses = df_expenses[
                df_expenses['description'].str.contains(search_term, na=False, case=False) |
                df_expenses['category'].str.contains(search_term, na=False, case=False) |
                df_expenses['user'].str.contains(search_term, na=False, case=False)
            ]
        
        # データフレーム表示
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
        
        # 合計表示
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
                categories = get_categories()
                category_names = [cat['name'] for cat in categories]
                budget_category = st.selectbox("科目", category_names)
                budget_amount = st.number_input("予算金額", min_value=1, value=50000)
                
            with col2:
                budget_period = st.selectbox("期間", ["monthly", "yearly"])
                budget_year = st.number_input("年", min_value=2020, max_value=2030, value=st.session_state.current_year)
                
            budget_month = None
            if budget_period == "monthly":
                budget_month = st.selectbox("月", range(1, 13), index=st.session_state.current_month - 1)
            
            if st.form_submit_button("予算を設定"):
                budget_data = {
                    "category": budget_category,
                    "amount": budget_amount,
                    "period": budget_period,
                    "year": budget_year,
                    "month": budget_month if budget_period == "monthly" else None
                }
                
                result = api_request("POST", "/api/budgets", data=budget_data)
                if result:
                    st.success("予算が設定されました！")
                    st.rerun()
    
    # 予算一覧
    period_type = st.selectbox("表示期間", ["月次", "年次"])
    
    if period_type == "月次":
        budgets = get_budgets(st.session_state.current_year, st.session_state.current_month)
        budget_summary = get_budget_summary(st.session_state.current_year, st.session_state.current_month)
    else:
        budgets = get_budgets(st.session_state.current_year)
        budget_summary = get_budget_summary(st.session_state.current_year)
    
    if budget_summary:
        st.subheader("予算達成状況")
        
        # 予算サマリー表示
        df_summary = pd.DataFrame(budget_summary)
        
        for _, row in df_summary.iterrows():
            col1, col2, col3 = st.columns([2, 1, 1])
            
            with col1:
                st.write(f"**{row['category']}**")
                progress_value = min(row['percentage'] / 100, 1.0)
                color = "red" if row['is_over_budget'] else "green"
                st.progress(progress_value)
                
            with col2:
                st.metric("予算", format_currency(row['budget']))
                
            with col3:
                st.metric("使用済み", format_currency(row['used']))
    
    if budgets:
        st.subheader("予算設定一覧")
        df_budgets = pd.DataFrame(budgets)
        df_budgets['amount_formatted'] = df_budgets['amount'].apply(format_currency)
        df_budgets['period_display'] = df_budgets.apply(
            lambda x: f"{x['month']}月" if x['period'] == 'monthly' else "年間", axis=1
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
    
    # レポート取得
    report = get_monthly_report(st.session_state.current_year, st.session_state.current_month)
    
    if report:
        # サマリー表示
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("総支出額", format_currency(report['total_expenses']))
        with col2:
            st.metric("総予算額", format_currency(report['total_budget']))
        with col3:
            utilization_color = "red" if report['budget_utilization'] > 100 else "green"
            st.metric("予算達成率", f"{report['budget_utilization']:.1f}%")
        with col4:
            st.metric("支出件数", f"{report['expense_count']}件")
        
        st.divider()
        
        # 詳細分析
        if report['categories']:
            st.subheader("科目別詳細分析")
            
            df_analysis = pd.DataFrame(report['categories'])
            
            # 円グラフ - 予算配分
            col1, col2 = st.columns(2)
            
            with col1:
                st.subheader("予算配分")
                fig_budget = px.pie(
                    df_analysis,
                    values='budget',
                    names='category',
                    title="科目別予算配分"
                )
                st.plotly_chart(fig_budget, use_container_width=True)
            
            with col2:
                st.subheader("実際の支出")
                fig_actual = px.pie(
                    df_analysis,
                    values='used',
                    names='category',
                    title="科目別実績"
                )
                st.plotly_chart(fig_actual, use_container_width=True)
            
            # 詳細テーブル
            st.subheader("予算実績対比表")
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
        
        # CSVエクスポート
        st.subheader("データエクスポート")
        if st.button("今月のデータをCSVでダウンロード"):
            # CSVダウンロードリンクを生成
            csv_url = f"{API_BASE}/api/expenses/export?year={st.session_state.current_year}&month={st.session_state.current_month}"
            st.markdown(f"[CSVファイルをダウンロード]({csv_url})")
    
    else:
        st.warning("レポートデータがありません")

elif page == "データ管理":
    st.title("📁 データ管理")
    
    # CSVインポート
    st.subheader("CSVインポート")
    
    with st.expander("CSVファイル形式について"):
        st.write("""
        **必要な列:**
        - 日付 (例: 2024-12-15)
        - 科目 (例: 交通費)
        - 金額 (例: 340)
        - 使用者 (例: 田中太郎)
        - 説明 (任意)
        
        **サンプル:**
        ```
        日付,科目,金額,使用者,説明
        2024-12-15,交通費,340,田中太郎,電車代
        2024-12-15,食費,1200,佐藤花子,昼食代
        ```
        """)
    
    uploaded_file = st.file_uploader("CSVファイルを選択", type=['csv'])
    
    if uploaded_file is not None:
        if st.button("インポート実行"):
            files = {"file": uploaded_file}
            try:
                response = requests.post(f"{API_BASE}/api/expenses/import", files=files)
                if response.status_code == 200:
                    result = response.json()
                    st.success(result['message'])
                    if result.get('errors'):
                        st.warning("一部のデータでエラーが発生しました:")
                        for error in result['errors']:
                            st.write(f"- {error}")
                else:
                    st.error("インポートに失敗しました")
            except Exception as e:
                st.error(f"エラー: {str(e)}")
    
    st.divider()
    
    # CSVエクスポート
    st.subheader("CSVエクスポート")
    
    col1, col2 = st.columns(2)
    
    with col1:
        if st.button("今月のデータをエクスポート"):
            csv_url = f"{API_BASE}/api/expenses/export?year={st.session_state.current_year}&month={st.session_state.current_month}"
            st.markdown(f"[CSVファイルをダウンロード]({csv_url})")
    
    with col2:
        if st.button("全データをエクスポート"):
            csv_url = f"{API_BASE}/api/expenses/export"
            st.markdown(f"[CSVファイルをダウンロード]({csv_url})")

# フッター
st.divider()
st.caption("予算管理システム - Python版")