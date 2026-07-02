@echo off
REM Double-click to start the JSON desktop pet.
REM ELECTRON_RUN_AS_NODE must be empty or Electron runs as plain Node and the app won't start.
set "ELECTRON_RUN_AS_NODE="
start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0."
