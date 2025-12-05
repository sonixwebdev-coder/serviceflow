#!/bin/bash

# Dev startup script - starts Redis if needed, then starts the app

echo "🔍 Checking Redis..."

# Check if Redis is already running
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is already running"
else
    echo "🚀 Starting Redis server..."
    # Start Redis in background (daemonized)
    redis-server --daemonize yes --port 6379

    # Wait a moment for Redis to start
    sleep 1

    # Verify it started
    if redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis started successfully"
    else
        echo "⚠️  Redis failed to start - app will run without cache"
    fi
fi

echo "🚀 Starting Node.js server..."

# Start the Node.js application
nodemon server.js
