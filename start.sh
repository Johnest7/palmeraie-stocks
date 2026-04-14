#!/bin/bash
# start.sh — Lance le serveur backend La Palmeraie
# Usage: bash start.sh

echo "🌴 La Palmeraie — Démarrage du serveur..."
echo ""

# Go to backend folder
cd "$(dirname "$0")/backend"

# Check Python
if ! command -v python3 &> /dev/null; then
  echo "❌ Python3 non trouvé. Installez Python 3.10+"
  exit 1
fi

# Install dependencies if needed
echo "📦 Vérification des dépendances..."
pip install -r ../requirements.txt --break-system-packages -q

echo ""
echo "✅ Serveur démarré sur http://localhost:8000"
echo "📚 Documentation API : http://localhost:8000/docs"
echo ""
echo "Pour accéder à l'app, ouvrez frontend/index.html dans votre navigateur."
echo "Ou utilisez un serveur local : cd frontend && python3 -m http.server 3000"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter."
echo ""

# Start FastAPI
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
