@echo off
echo.
echo  *** La Palmeraie - Demarrage ***
echo.

cd /d "%~dp0backend"

echo Installation des dependances Python...
pip install -r ..\requirements.txt

echo.
echo Serveur demarre sur http://localhost:8000
echo.
echo Ouvrez un 2eme terminal et tapez:
echo   cd "%~dp0frontend"
echo   python -m http.server 3000
echo.
echo Puis ouvrez: http://localhost:3000/login.html
echo.
echo Appuyez sur Ctrl+C pour arreter.
echo.

python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
pause
