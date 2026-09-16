@echo off
REM dev.cmd - lets you start everything with just: dev  (from repo root)
powershell -ExecutionPolicy Bypass -File "%~dp0dev.ps1" %*
