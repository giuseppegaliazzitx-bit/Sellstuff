"""Start API + Vite together. Works on Windows Git Bash and PowerShell."""

from __future__ import annotations

import os
import signal
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"


def _venv_python() -> Path:
    if os.name == "nt":
        candidate = ROOT / ".venv" / "Scripts" / "python.exe"
    else:
        candidate = ROOT / ".venv" / "bin" / "python"
    return candidate if candidate.exists() else Path(sys.executable)


def main() -> int:
    env = os.environ.copy()
    py = str(_venv_python())
    api = subprocess.Popen(
        [py, "-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"],
        cwd=BACKEND,
        env=env,
    )
    web = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=FRONTEND,
        env=env,
        shell=(os.name == "nt"),
    )

    def _stop(_signum: int, _frame: object) -> None:
        for proc in (api, web):
            if proc.poll() is None:
                proc.terminate()

    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)

    print("API  http://127.0.0.1:8000")
    print("SPA  http://127.0.0.1:5173")
    print("Ctrl+C to stop")
    codes = []
    for proc in (api, web):
        codes.append(proc.wait())
    return max(codes) if codes else 0


if __name__ == "__main__":
    raise SystemExit(main())
