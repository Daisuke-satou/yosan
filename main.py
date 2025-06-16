#!/usr/bin/env python3
"""
予算管理システム - Python版エントリーポイント
"""

import subprocess
import sys
import os

def main():
    """Streamlitアプリケーションを起動"""
    try:
        # Streamlitアプリを起動
        subprocess.run([
            sys.executable, "-m", "streamlit", 
            "run", "start_python_app.py",
            "--server.port", "8501",
            "--server.address", "0.0.0.0",
            "--server.headless", "true"
        ])
    except KeyboardInterrupt:
        print("アプリケーションを終了しています...")
    except Exception as e:
        print(f"エラー: {e}")

if __name__ == "__main__":
    main()