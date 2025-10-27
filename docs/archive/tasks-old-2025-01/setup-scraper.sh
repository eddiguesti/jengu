#!/bin/bash

# setup-scraper.sh - Complete setup script for Sanary campsite scraper

echo "🏖️ Sanary-sur-Mer Campsite Scraper Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js first: https://nodejs.org"
    exit 1
fi

echo -e "${GREEN}✅ Node.js found:${NC} $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm found:${NC} $(npm --version)"

# Create project directory
echo ""
echo "📁 Creating project structure..."

mkdir -p sanary-scraper
cd sanary-scraper

# Create subdirectories
mkdir -p src/scrapers
mkdir -p src/workers
mkdir -p src/routes
mkdir -p dist
mkdir -p data

# Copy files
echo "📄 Creating project files..."

# Create tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

echo -e "${GREEN}✅ Created tsconfig.json${NC}"

# Copy package.json from outputs
cp ../package.json .
echo -e "${GREEN}✅ Created package.json${NC}"

# Copy scraper code
cp ../SanaryCampingScraper.ts src/scrapers/
echo -e "${GREEN}✅ Created scraper class${NC}"

# Copy test script
cp ../test-scraper.ts src/
echo -e "${GREEN}✅ Created test script${NC}"

# Copy .env.example
cp ../.env.example .env.example
echo -e "${GREEN}✅ Created .env.example${NC}"

# Check for existing .env
if [ ! -f .env ]; then
    echo ""
    echo -e "${YELLOW}📝 Creating .env file...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env file with your credentials${NC}"
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Install Playwright browsers
echo ""
echo "🌐 Installing Chromium browser for scraping..."
npx playwright install chromium

# Create a simple run script
cat > run.sh << 'EOF'
#!/bin/bash
echo "🚀 Running Sanary Campsite Scraper..."
npm run test
EOF

chmod +x run.sh

# Create a README
cat > README.md << 'EOF'
# Sanary-sur-Mer Campsite Scraper

## Quick Start

1. Edit `.env` file with your credentials:
   - Add your Redis URL
   - Add your Supabase keys
   - Set your property ID

2. Run the scraper:
   ```bash
   ./run.sh
   # or
   npm run test
   ```

3. Check results in the generated JSON file

## Commands

- `npm run test` - Run test scraper
- `npm run build` - Build TypeScript
- `npm run dev` - Run in development mode

## Features

- Scrapes multiple French camping platforms
- Focuses on Sanary-sur-Mer coastal region (30km radius)
- Caches results in Redis
- Deduplicates campsites across platforms
- Extracts prices, availability, ratings

## Platforms Scraped

1. vacances-campings.fr
2. camping.fr
3. Local campsite websites

## Output

Results are saved to: `sanary-campsites-[date].json`
EOF

echo -e "${GREEN}✅ Created README.md${NC}"

# Final summary
echo ""
echo "=========================================="
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Edit the .env file with your credentials:"
echo "   cd sanary-scraper"
echo "   nano .env"
echo ""
echo "2. Run the scraper:"
echo "   ./run.sh"
echo "   # or"
echo "   npm run test"
echo ""
echo "3. Check results in the JSON file"
echo ""
echo -e "${YELLOW}Note: The scraper will search for campsites in:${NC}"
echo "  - Sanary-sur-Mer"
echo "  - Bandol"
echo "  - Six-Fours-les-Plages"
echo "  - Saint-Cyr-sur-Mer"
echo ""
echo "Happy scraping! 🏖️"
