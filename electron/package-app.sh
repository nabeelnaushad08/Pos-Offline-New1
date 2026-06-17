#!/bin/bash
set -e

echo "=== Building POS Offline App ==="

# 1. Build Next.js standalone
echo "Step 1: Building Next.js..."
NEXT_BUILD_STANDALONE=1 npm run build

# 2. Copy .next/static into standalone folder (required)
echo "Step 2: Copying static assets..."
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

# 3. Install electron dependencies and build
echo "Step 3: Building Electron installer..."
npm run electron:build

echo ""
echo "=== Build Complete ==="
echo "Installer is in the dist/ folder"
