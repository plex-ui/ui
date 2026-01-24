#!/bin/bash

# Script to delete GitHub environment (which will delete all associated deployments)
# Usage: ./scripts/delete-environment.sh [GITHUB_TOKEN]
# If token is not provided, it will try to use GITHUB_TOKEN env variable
# 
# NOTE: This requires a token with 'admin:repo' or 'repo' scope with admin rights

REPO_OWNER="plex-ui"
REPO_NAME="ui"
ENVIRONMENT="github-pages"
GITHUB_TOKEN="${1:-${GITHUB_TOKEN}}"

if [ -z "$GITHUB_TOKEN" ]; then
  echo "Error: GitHub token is required"
  echo "Usage: $0 [GITHUB_TOKEN]"
  echo "Or set GITHUB_TOKEN environment variable"
  echo ""
  echo "NOTE: Token must have 'admin:repo' or 'repo' scope with admin rights"
  exit 1
fi

API_URL="https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/environments/${ENVIRONMENT}"

echo "Deleting environment '${ENVIRONMENT}' (this will delete all associated deployments)..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X DELETE \
  -H "Authorization: token ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github.v3+json" \
  "${API_URL}")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" = "204" ]; then
  echo "✓ Successfully deleted environment '${ENVIRONMENT}' and all associated deployments"
elif [ "$HTTP_STATUS" = "403" ]; then
  echo "✗ Error: Token doesn't have sufficient permissions"
  echo "Response: $BODY"
  echo ""
  echo "The token needs 'admin:repo' or 'repo' scope with admin rights."
  echo "Please create a new token with admin rights at:"
  echo "https://github.com/settings/tokens"
  exit 1
elif [ "$HTTP_STATUS" = "404" ]; then
  echo "✓ Environment '${ENVIRONMENT}' not found (may already be deleted)"
else
  echo "✗ Error: Failed to delete environment"
  echo "HTTP Status: $HTTP_STATUS"
  echo "Response: $BODY"
  exit 1
fi

echo "Done!"

