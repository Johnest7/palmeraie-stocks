@echo off
echo.
echo  *** La Palmeraie - Frontend ***
echo.
cd /d "%~dp0frontend"
echo Frontend demarre sur http://localhost:3000
echo Ouvrez: http://localhost:3000/login.html
echo.
echo Appuyez sur Ctrl+C pour arreter.
echo.
python -m http.server 3000
pause
