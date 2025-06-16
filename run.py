#!/usr/bin/env python3
"""
予算管理システム - Python版
FastAPI + Streamlit を使用した予算管理アプリケーション
"""

import subprocess
import sys
import time
import threading
import os
import signal

def run_api_server():
    """FastAPI サーバーを起動"""
    try:
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "api:app", 
            "--host", "0.0.0.0", 
            "--port", "8000",
            "--reload"
        ], check=True)
    except KeyboardInterrupt:
        print("API server stopped")
    except Exception as e:
        print(f"API server error: {e}")

def run_streamlit_app():
    """Streamlit アプリを起動"""
    try:
        subprocess.run([
            sys.executable, "-m", "streamlit", 
            "run", "app.py",
            "--server.port", "8501",
            "--server.address", "0.0.0.0"
        ], check=True)
    except KeyboardInterrupt:
        print("Streamlit app stopped")
    except Exception as e:
        print(f"Streamlit app error: {e}")

def main():
    """メイン関数 - 両方のサーバーを並行起動"""
    print("予算管理システムを起動しています...")
    print("API Server: http://localhost:8000")
    print("Streamlit App: http://localhost:8501")
    print("\n終了するには Ctrl+C を押してください\n")
    
    try:
        # FastAPI サーバーをバックグラウンドで起動
        api_thread = threading.Thread(target=run_api_server, daemon=True)
        api_thread.start()
        
        # 少し待ってからStreamlitを起動
        time.sleep(2)
        
        # Streamlit アプリをメインプロセスで起動
        run_streamlit_app()
        
    except KeyboardInterrupt:
        print("\n\nアプリケーションを終了しています...")
        sys.exit(0)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()