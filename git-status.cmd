@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\git-sync-status.ps1" %*
exit /b %ERRORLEVEL%
