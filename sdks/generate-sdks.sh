#!/bin/bash
# ========================================
# SDK Generation Script
# ========================================
# Generates TypeScript and Python SDKs from OpenAPI spec
# using openapi-generator-cli
#
# Prerequisites:
#   - Node.js 18+ and npm
#   - Java 11+ (for openapi-generator)
#
# Usage:
#   ./generate-sdks.sh
#   ./generate-sdks.sh --typescript-only
#   ./generate-sdks.sh --python-only
#
# Author: Engineering Team
# Date: 2025-10-23
# ========================================

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Jengu SDK Generation${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command -v npx &> /dev/null; then
    echo -e "${RED}Error: npm/npx not found. Please install Node.js 18+${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js/npm installed${NC}"

# Install openapi-generator-cli if not already installed
if ! npx openapi-generator-cli version &> /dev/null; then
    echo -e "${BLUE}Installing openapi-generator-cli...${NC}"
    npm install -g @openapitools/openapi-generator-cli
fi

echo -e "${GREEN}✓ openapi-generator-cli ready${NC}"
echo ""

# Parse arguments
GENERATE_TS=true
GENERATE_PY=true

if [ "$1" == "--typescript-only" ]; then
    GENERATE_PY=false
elif [ "$1" == "--python-only" ]; then
    GENERATE_TS=false
fi

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
OPENAPI_SPEC="$ROOT_DIR/backend/openapi.json"
OUTPUT_DIR="$SCRIPT_DIR"

# Verify OpenAPI spec exists
if [ ! -f "$OPENAPI_SPEC" ]; then
    echo -e "${RED}Error: OpenAPI spec not found at $OPENAPI_SPEC${NC}"
    exit 1
fi

echo -e "${GREEN}✓ OpenAPI spec found${NC}"
echo ""

# ========================================
# Generate TypeScript SDK
# ========================================

if [ "$GENERATE_TS" = true ]; then
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Generating TypeScript SDK...${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""

    TS_OUTPUT_DIR="$OUTPUT_DIR/typescript"

    # Clean previous build
    rm -rf "$TS_OUTPUT_DIR"

    # Generate SDK
    npx openapi-generator-cli generate \
        -i "$OPENAPI_SPEC" \
        -g typescript-axios \
        -o "$TS_OUTPUT_DIR" \
        -c "$SCRIPT_DIR/typescript-config.json" \
        --additional-properties=npmName=@jengu/sdk,npmVersion=1.0.0

    echo ""
    echo -e "${GREEN}✓ TypeScript SDK generated at $TS_OUTPUT_DIR${NC}"

    # Install dependencies
    echo ""
    echo -e "${BLUE}Installing TypeScript SDK dependencies...${NC}"
    cd "$TS_OUTPUT_DIR"
    npm install

    # Build SDK
    echo ""
    echo -e "${BLUE}Building TypeScript SDK...${NC}"
    npm run build

    echo ""
    echo -e "${GREEN}✓ TypeScript SDK built successfully${NC}"
fi

# ========================================
# Generate Python SDK
# ========================================

if [ "$GENERATE_PY" = true ]; then
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Generating Python SDK...${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""

    PY_OUTPUT_DIR="$OUTPUT_DIR/python"

    # Clean previous build
    rm -rf "$PY_OUTPUT_DIR"

    # Generate SDK
    npx openapi-generator-cli generate \
        -i "$OPENAPI_SPEC" \
        -g python \
        -o "$PY_OUTPUT_DIR" \
        -c "$SCRIPT_DIR/python-config.json" \
        --additional-properties=packageName=jengu_sdk,packageVersion=1.0.0,projectName=jengu-sdk

    echo ""
    echo -e "${GREEN}✓ Python SDK generated at $PY_OUTPUT_DIR${NC}"

    # Install dependencies
    echo ""
    echo -e "${BLUE}Installing Python SDK dependencies...${NC}"
    cd "$PY_OUTPUT_DIR"

    # Create virtual environment (optional)
    if command -v python3 &> /dev/null; then
        python3 -m venv venv
        source venv/bin/activate
        pip install -e .
    else
        echo -e "${RED}Warning: Python 3 not found. Skipping installation.${NC}"
    fi

    echo ""
    echo -e "${GREEN}✓ Python SDK setup complete${NC}"
fi

# ========================================
# Summary
# ========================================

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}SDK Generation Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$GENERATE_TS" = true ]; then
    echo -e "${GREEN}TypeScript SDK:${NC}"
    echo -e "  Location: $OUTPUT_DIR/typescript"
    echo -e "  Package:  @jengu/sdk"
    echo -e "  Install:  npm install $OUTPUT_DIR/typescript"
    echo ""
fi

if [ "$GENERATE_PY" = true ]; then
    echo -e "${GREEN}Python SDK:${NC}"
    echo -e "  Location: $OUTPUT_DIR/python"
    echo -e "  Package:  jengu-sdk"
    echo -e "  Install:  pip install $OUTPUT_DIR/python"
    echo ""
fi

echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. Test SDKs with sample applications"
echo -e "  2. Publish to GitHub Packages (see publish-sdks.sh)"
echo -e "  3. Update partner documentation"
echo ""
