$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-Command",
  "cd '$backend'; .\venv\Scripts\Activate.ps1; python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload"
)

Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-Command",
  "cd '$frontend'; `$env:EXPO_PUBLIC_BACKEND_URL='http://localhost:8000'; npx expo start --web --clear --port 8083"
)

Start-Sleep -Seconds 18
Start-Process "http://localhost:8000/api/"
Start-Process "http://localhost:8083/auth/login"
