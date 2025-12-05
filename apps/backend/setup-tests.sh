#!/bin/bash

# Backend Test Setup Script
# This script installs necessary test dependencies and runs tests

set -e

echo "======================================"
echo "Backend Test Setup"
echo "======================================"
echo ""

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found. Please run this script from apps/backend directory"
    exit 1
fi

# Install missing test dependencies
echo "📦 Installing test dependencies..."
npm install --save-dev supertest

echo ""
echo "✅ Dependencies installed successfully!"
echo ""

# Run tests
echo "🧪 Running tests..."
echo ""
npm test

echo ""
echo "======================================"
echo "Test Setup Complete!"
echo "======================================"
echo ""
echo "Available test commands:"
echo "  npm test                    - Run all tests"
echo "  npm test -- --coverage      - Run tests with coverage"
echo "  npm test -- --watch         - Run tests in watch mode"
echo "  npm test userService.test.js - Run specific test file"
echo ""
