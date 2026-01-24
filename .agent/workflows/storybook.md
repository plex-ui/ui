---
description: How to run Storybook for development
---

# Running Storybook

// turbo-all

1. **IMPORTANT**: Never run multiple Storybook instances simultaneously. Always check if one is already running before starting a new one.

2. Kill any existing Storybook processes first:

```bash
pkill -f "storybook" || true
```

3. Start Storybook on port 6006:

```bash
npm run storybook -- -p 6006
```

4. Open http://localhost:6006/ in the browser

## Rules

- Only ONE Storybook instance should be running at a time
- Always use port 6006
- If you need to restart, kill existing processes first
