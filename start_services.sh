#!/bin/bash

echo "🚀 Starting AIMS Services..."

# Start Django backend server
echo "📦 Starting Django backend server on port 8000..."
cd /workspace
python manage.py runserver 0.0.0.0:8000 &
DJANGO_PID=$!
echo "✅ Django server started with PID: $DJANGO_PID"

# Wait a moment for Django to start
sleep 3

# Start Next.js frontend
echo "🎨 Starting Next.js frontend on port 3000..."
cd /workspace/frontend
npm run dev &
NEXTJS_PID=$!
echo "✅ Next.js server started with PID: $NEXTJS_PID"

echo ""
echo "🎉 All services started successfully!"
echo ""
echo "📌 Access the application at:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:8000"
echo ""
echo "📚 Smart Import Tool available at:"
echo "   - http://localhost:3000/import"
echo ""
echo "To stop all services, press Ctrl+C"
echo ""

# Wait for interrupt
trap "echo '⏹️  Stopping services...'; kill $DJANGO_PID $NEXTJS_PID; exit" INT
wait