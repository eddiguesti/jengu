#!/usr/bin/env bash
set -euo pipefail

# Bootstrap helper for local dev. This script does NOT run docker.
# It helps install pnpm (via corepack or npm) if Node is installed.

print_help() {
  cat <<EOF
Usage: bootstrap.sh

Checks for Node and pnpm and attempts to enable/install pnpm.
EOF
}

if ! command -v node >/dev/null 2>&1; then
  echo "node not found. Please install Node 20+ first: https://nodejs.org/"
  exit 1
fi

echo "node: $(node -v)"

if command -v pnpm >/dev/null 2>&1; then
  echo "pnpm already installed: $(pnpm -v)"
  exit 0
fi

if command -v corepack >/dev/null 2>&1; then
  echo "Enabling corepack and preparing pnpm..."
  corepack enable
  corepack prepare pnpm@latest --activate
  echo "pnpm: $(pnpm -v)"
  exit 0
fi

echo "corepack not available. Installing pnpm via npm (requires npm)."
if command -v npm >/dev/null 2>&1; then
  npm install -g pnpm
  echo "pnpm: $(pnpm -v)"
  exit 0
else
  echo "npm not found. Please install Node/npm or use Docker to run the backend."
  exit 1
fi
