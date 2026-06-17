#!/bin/bash
set -e

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   Zenthoz POS - Offline Build Script         ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Step 1: Install dependencies
echo "→ Step 1: Installing dependencies..."
npm install

# Step 2: Build Next.js in standalone mode
echo ""
echo "→ Step 2: Building Next.js (standalone)..."
NEXT_BUILD_STANDALONE=1 npm run build

# Step 3: Copy static assets into standalone
echo ""
echo "→ Step 3: Copying static assets..."
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
if [ -d "public" ]; then
  cp -r public .next/standalone/public 2>/dev/null || true
fi

# Step 4: Generate Prisma client
echo ""
echo "→ Step 4: Generating Prisma client..."
npx prisma generate

# Step 5: Build Electron installer
echo ""
echo "→ Step 5: Building Electron installer..."
npx electron-builder --config electron-builder.yml

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   Build Complete!                             ║"
echo "║   Installer is in: dist-installer/           ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
