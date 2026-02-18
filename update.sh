#!/bin/bash
set -e

DASHBOARD_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DASHBOARD_DIR"

echo "⚡ VidClaw Update"
echo ""

if [ "$1" = "--latest" ]; then
  echo "📥 Pulling latest changes from main (bleeding edge)..."
  git pull origin main
  VERSION="main (HEAD)"
else
  echo "📥 Fetching tags..."
  git fetch --tags
  LATEST_TAG=$(git tag -l 'v*' --sort=-v:refname | head -n1)
  if [ -z "$LATEST_TAG" ]; then
    echo "❌ No tags found. Use --latest to pull from main."
    exit 1
  fi
  echo "📌 Checking out $LATEST_TAG..."
  git checkout "$LATEST_TAG"
  VERSION="$LATEST_TAG"
fi

echo "📦 Installing dependencies..."
npm install --production=false

echo "🔨 Building frontend..."
npm run build

echo "🔄 Restarting service..."
sudo systemctl restart vidclaw

echo ""
echo "✅ VidClaw updated to $VERSION and restarted!"
