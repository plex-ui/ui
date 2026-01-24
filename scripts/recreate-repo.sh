#!/bin/bash

# Script to recreate repository with clean contributor history
# Usage: ./scripts/recreate-repo.sh
#
# IMPORTANT: You must delete the old repository manually first:
# 1. Go to https://github.com/plex-ui/ui/settings
# 2. Scroll to "Danger Zone"
# 3. Click "Delete this repository"
# 4. Type "plex-ui/ui" to confirm
# 5. Then run this script

set -e

REPO_NAME="ui"
REPO_OWNER="plex-ui"
REPO_DESC="Modern design system for building high-quality applications"

echo "=========================================="
echo "Repository Recreation Script"
echo "=========================================="
echo ""
echo "This script will:"
echo "1. Check if old repository is deleted"
echo "2. Create a new repository"
echo "3. Push all branches and tags"
echo ""
echo "IMPORTANT: Make sure you've deleted the old repository first!"
echo "Go to: https://github.com/${REPO_OWNER}/${REPO_NAME}/settings"
echo "Then scroll to 'Danger Zone' and delete the repository"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Check if remote still exists
if git remote get-url origin &>/dev/null; then
  CURRENT_REMOTE=$(git remote get-url origin)
  if [[ "$CURRENT_REMOTE" == *"${REPO_OWNER}/${REPO_NAME}"* ]]; then
    echo ""
    echo "⚠️  WARNING: Remote still points to old repository!"
    echo "Current remote: $CURRENT_REMOTE"
    echo ""
    read -p "Have you deleted the old repository? (yes/no): " CONFIRM
    if [[ "$CONFIRM" != "yes" ]]; then
      echo "Please delete the repository first, then run this script again."
      exit 1
    fi
  fi
fi

echo ""
echo "Step 1: Removing old remote (if exists)..."
git remote remove origin 2>/dev/null || true

echo ""
echo "Step 2: Creating new repository..."
echo "Note: This requires a token with 'repo' scope"
echo ""

# Try to create via API (if token has permissions)
if [ -n "$GITHUB_TOKEN" ]; then
  echo "Attempting to create repository via API..."
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
    -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github.v3+json" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${REPO_NAME}\",\"private\":false,\"description\":\"${REPO_DESC}\"}" \
    "https://api.github.com/user/repos")
  
  HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')
  
  if [ "$HTTP_STATUS" = "201" ]; then
    echo "✓ Repository created successfully via API"
    REPO_URL=$(echo "$BODY" | jq -r '.clone_url' 2>/dev/null || echo "")
  else
    echo "⚠️  API creation failed (HTTP $HTTP_STATUS)"
    echo "You'll need to create the repository manually:"
    echo "1. Go to https://github.com/new"
    echo "2. Repository name: ${REPO_NAME}"
    echo "3. Description: ${REPO_DESC}"
    echo "4. Make it Public"
    echo "5. DO NOT initialize with README, .gitignore, or license"
    echo "6. Click 'Create repository'"
    echo ""
    read -p "Press Enter after you've created the repository..."
    REPO_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}.git"
  fi
else
  echo "GITHUB_TOKEN not set. Please create repository manually:"
  echo "1. Go to https://github.com/new"
  echo "2. Repository name: ${REPO_NAME}"
  echo "3. Description: ${REPO_DESC}"
  echo "4. Make it Public"
  echo "5. DO NOT initialize with README, .gitignore, or license"
  echo "6. Click 'Create repository'"
  echo ""
  read -p "Press Enter after you've created the repository..."
  REPO_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}.git"
fi

echo ""
echo "Step 3: Adding new remote..."
git remote add origin "$REPO_URL"

echo ""
echo "Step 4: Pushing all branches..."
git push -u origin main

echo ""
echo "Step 5: Pushing all tags..."
git push origin --tags

echo ""
echo "=========================================="
echo "✓ Repository recreated successfully!"
echo "=========================================="
echo ""
echo "Repository URL: https://github.com/${REPO_OWNER}/${REPO_NAME}"
echo ""
echo "The contributors list should now show only you."
echo "It may take a few minutes for GitHub to update the cache."

