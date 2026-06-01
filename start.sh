#!/bin/bash
# Start both backend and frontend together

echo "🚀 Starting PDF Merger..."

# Start backend
cd "$(dirname "$0")/backend"
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt -q

echo "▶  Backend starting on http://localhost:8000"
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Start frontend
cd ../frontend
echo "📦 Installing Node dependencies..."
npm install -q

echo "▶  Frontend starting on http://localhost:3000"
npm start &
FRONTEND_PID=$!

echo ""
echo "✅  Both servers running!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   API docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both."

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
