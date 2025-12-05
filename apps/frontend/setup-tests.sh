#!/bin/bash

# Frontend Test Setup Script
# This script installs necessary test dependencies and runs tests

set -e

echo "======================================"
echo "Frontend Test Setup"
echo "======================================"
echo ""

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found. Please run this script from apps/frontend directory"
    exit 1
fi

# Install missing test dependencies
echo "📦 Installing test dependencies..."
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom

echo ""
echo "✅ Dependencies installed successfully!"
echo ""

# Update package.json with test scripts
echo "📝 Updating package.json with test scripts..."

# Check if jq is available for JSON manipulation
if command -v jq &> /dev/null; then
    # Use jq to update scripts
    tmp=$(mktemp)
    jq '.scripts.test = "vitest" | .scripts["test:coverage"] = "vitest --coverage" | .scripts["test:ui"] = "vitest --ui"' package.json > "$tmp" && mv "$tmp" package.json
    echo "✅ package.json updated"
else
    echo "⚠️  Please manually add these scripts to package.json:"
    echo '  "test": "vitest",'
    echo '  "test:coverage": "vitest --coverage",'
    echo '  "test:ui": "vitest --ui"'
fi

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
echo "  npm test                - Run all tests"
echo "  npm run test:coverage   - Run tests with coverage"
echo "  npm run test:ui         - Run tests with UI"
echo "  npm test -- --watch     - Run tests in watch mode"
echo ""
