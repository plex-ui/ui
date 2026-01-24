#!/bin/bash

# Script to delete GitHub deployments
# Usage: ./scripts/delete-deployments.sh [GITHUB_TOKEN]
# If token is not provided, it will try to use GITHUB_TOKEN env variable

REPO_OWNER="plex-ui"
REPO_NAME="ui"
GITHUB_TOKEN="${1:-${GITHUB_TOKEN}}"

if [ -z "$GITHUB_TOKEN" ]; then
  echo "Error: GitHub token is required"
  echo "Usage: $0 [GITHUB_TOKEN]"
  echo "Or set GITHUB_TOKEN environment variable"
  exit 1
fi

API_URL="https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/deployments"

echo "Fetching deployments..."
DEPLOYMENTS=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github.v3+json" \
  "${API_URL}")

if [ $? -ne 0 ]; then
  echo "Error: Failed to fetch deployments"
  exit 1
fi

DEPLOYMENT_COUNT=$(echo "$DEPLOYMENTS" | jq '. | length' 2>/dev/null || echo "0")

if [ "$DEPLOYMENT_COUNT" = "0" ] || [ -z "$DEPLOYMENT_COUNT" ]; then
  echo "No deployments found or failed to parse response"
  echo "Response: $DEPLOYMENTS"
  exit 1
fi

echo "Found $DEPLOYMENT_COUNT deployment(s)"

# Update each deployment status to inactive (GitHub doesn't allow direct deletion)
echo "$DEPLOYMENTS" | jq -r '.[].id' | while read -r deployment_id; do
  if [ -n "$deployment_id" ]; then
    echo "Deactivating deployment $deployment_id..."
    
    # Update deployment status to inactive
    RESPONSE=$(curl -s -X POST \
      -H "Authorization: token ${GITHUB_TOKEN}" \
      -H "Accept: application/vnd.github.v3+json" \
      -H "Content-Type: application/json" \
      -d "{\"state\":\"inactive\"}" \
      "${API_URL}/${deployment_id}/statuses")
    
    if [ $? -eq 0 ]; then
      echo "✓ Deactivated deployment $deployment_id"
    else
      echo "✗ Failed to deactivate deployment $deployment_id"
      echo "Response: $RESPONSE"
    fi
  fi
done

echo "Done!"

