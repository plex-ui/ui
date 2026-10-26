#!/bin/bash
# Full sync — main repo, .memory submodule, figma-ai-bridge plugin.
# Idempotent: safe to run any time on any maintainer machine.
#
# Cleans legacy artifacts in figma/plugin/ (figma-mcp-bridge, plex-ui,
# stale zips, .DS_Store) that aren't part of the synced product. The
# plugin lives only as a clone of plex-ui/figma-ai-bridge inside
# figma/plugin/figma-ai-bridge/.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "→ Pulling main repo (plex-ui/docs)…"
prev_head=$(git rev-parse HEAD)
git pull --no-recurse-submodules
new_head=$(git rev-parse HEAD)

echo "→ Pulling .memory submodule (plex-ui/docs-memory)…"
( cd .memory && git checkout master --quiet && git pull )

echo "→ Cleaning figma/ — whitelist: plugin/ only"
mkdir -p figma
(
  cd figma
  shopt -s nullglob dotglob
  for entry in *; do
    case "$entry" in
      plugin) continue ;;
      *)
        echo "  removing figma/$entry"
        rm -rf -- "$entry"
        ;;
    esac
  done
)

echo "→ Cleaning figma/plugin/ — whitelist: figma-ai-bridge/ + figma-ai-bridge-v*.zip"
mkdir -p figma/plugin
(
  cd figma/plugin
  shopt -s nullglob dotglob
  for entry in *; do
    case "$entry" in
      figma-ai-bridge) continue ;;
      figma-ai-bridge-v*.zip) continue ;;
      *)
        echo "  removing figma/plugin/$entry"
        rm -rf -- "$entry"
        ;;
    esac
  done
)
# Note: figma-ai-bridge-v*.zip files are preserved — they are build outputs
# from ./build-zip.sh that the maintainer manually uploads to Lemon Squeezy.
# Run `rm figma/plugin/figma-ai-bridge-v*.zip` by hand to clean old builds.

echo "→ Syncing plugin (plex-ui/figma-ai-bridge)…"
if [[ -d figma/plugin/figma-ai-bridge/.git ]]; then
  ( cd figma/plugin/figma-ai-bridge && git pull )
else
  # Stale or missing local copy → wipe and clone fresh
  rm -rf figma/plugin/figma-ai-bridge
  git clone https://github.com/plex-ui/figma-ai-bridge.git figma/plugin/figma-ai-bridge
  chmod +x figma/plugin/figma-ai-bridge/build-zip.sh \
           figma/plugin/figma-ai-bridge/start-bridge.command
fi

echo "→ Building plugin zip for current VERSION…"
( cd figma/plugin/figma-ai-bridge && ./build-zip.sh )

echo "→ packages/styles + packages/ui rebuild gate…"
if [[ "$prev_head" != "$new_head" ]] && \
   git diff "$prev_head" "$new_head" --name-only -- packages/styles/ packages/ui/ | grep -q .; then
  echo "  packages/styles or packages/ui changed — rebuilding"
  npm run build:styles && npm run build:ui
  rm -rf .next
  echo "  ⚠ Restart the dev server via Claude Preview MCP if it was running."
else
  echo "  no packages/styles or packages/ui changes; nothing to rebuild"
fi

echo ""
echo "✓ Full sync complete"
echo "  main:    $(git rev-parse --short HEAD)"
echo "  .memory: $( cd .memory && git rev-parse --short HEAD )"
echo "  plugin:  $( cd figma/plugin/figma-ai-bridge && git rev-parse --short HEAD )"
