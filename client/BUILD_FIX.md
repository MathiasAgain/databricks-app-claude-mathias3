# Build Fix Guide

## Issue
If you encounter build errors related to `d3-shape` or corrupted `node_modules`, follow these steps:

## Solution 1: Fresh Install (Recommended)

```bash
# Navigate to client directory
cd client

# Remove node_modules and lock file
rm -rf node_modules
rm bun.lock

# Fresh install
bun install

# Try building
bun run build
```

## Solution 2: Development Mode

If build continues to fail, use development mode which handles dependencies better:

```bash
cd client
bun run dev
```

## Solution 3: Alternative Package Manager

If issues persist with bun, try npm:

```bash
cd client

# Remove bun files
rm -rf node_modules bun.lock

# Use npm
npm install
npm run build
```

## Verification

After fixing, verify the installation:

```bash
# Check if key dependencies are installed
ls node_modules/plotly.js-dist-min
ls node_modules/react-plotly.js
ls node_modules/zustand

# Start dev server
bun run dev
```

## For Production Deployment

The Databricks Apps deployment handles dependencies automatically. The local build issue won't affect deployment.

## Need Help?

If issues persist:
1. Ensure you're using Node.js v18+ and latest bun
2. Check system permissions for node_modules directory
3. Try on a different machine or clean environment
