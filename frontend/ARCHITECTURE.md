# Jengu Dynamic Pricing - React Frontend Architecture

## 🎨 Design System

### Color Palette
```
Primary (Lime): #EBFF57
Dark Background: #0A0A0A
Card Background: #1A1A1A
Elevated: #242424
Border: #2A2A2A
Text: #FAFAFA
Muted Text: #9CA3AF
Success: #10B981
Warning: #F59E0B
Error: #EF4444
```

### Typography
- **Font Family**: Inter (primary), SF Pro Display (fallback)
- **Headings**: 700 weight, tight leading
- **Body**: 400-500 weight, relaxed leading
- **Code/Mono**: JetBrains Mono

### Spacing Scale
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px
- 3xl: 64px

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Base components (Button, Input, Card)
│   │   ├── layout/         # Layout components (Sidebar, Header)
│   │   ├── charts/         # Chart components (using Recharts)
│   │   └── features/       # Feature-specific components
│   ├── pages/              # Page components
│   │   ├── Dashboard.tsx
│   │   ├── Data.tsx
│   │   ├── Insights.tsx
│   │   ├── Competitors.tsx
│   │   └── Settings.tsx
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API services
│   ├── store/              # State management (Zustand)
│   ├── types/              # TypeScript types
│   ├── utils/              # Utility functions
│   ├── styles/             # Global styles
│   ├── App.tsx             # Main app component
│   └── main.tsx            # Entry point
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

## 🧱 Core Components

### Button Component
```typescript
// Variants: primary, secondary, ghost, danger
// Sizes: sm, md, lg
// States: default, hover, active, disabled, loading
```

### Input Component
```typescript
// Types: text, email, number, password, textarea
// With label, error, helper text
// Icon support (left/right)
```

### Card Component
```typescript
// Variants: default, elevated, bordered
// With header, body, footer sections
```

### Modal/Dialog
```typescript
// Accessible, keyboard-friendly
// Backdrop blur effect
// Smooth enter/exit animations
```

## 🔌 Backend API Integration

### Flask REST API Structure
```
backend/
├── app.py                  # Main Flask app
├── api/
│   ├── __init__.py
│   ├── data.py            # Data upload endpoints
│   ├── enrichment.py      # Enrichment endpoints
│   ├── insights.py        # Insights endpoints
│   ├── competitors.py     # Competitor endpoints
│   └── models.py          # ML model endpoints
├── services/              # Business logic (from existing core/)
└── requirements.txt
```

### API Endpoints
```
POST   /api/data/upload          # Upload CSV/Excel
GET    /api/data/preview          # Preview uploaded data
POST   /api/enrichment/start      # Start enrichment
GET    /api/enrichment/status     # Check enrichment status
GET    /api/insights/weather      # Weather insights
GET    /api/insights/occupancy    # Occupancy analysis
POST   /api/competitors/discover  # Discover competitors
GET    /api/competitors/list      # Get competitors
POST   /api/models/train          # Train ML models
GET    /api/models/status         # Training status
POST   /api/optimize/run          # Generate recommendations
```

## 🎭 Pages Overview

### 1. Dashboard (Overview)
- **Layout**: 4-column KPI grid + 2-column chart grid
- **Components**: MetricCard, LineChart, AreaChart
- **Features**: Real-time data, quick actions

### 2. Data Upload
- **Layout**: Centered upload zone + data table
- **Components**: FileUploader, DataTable, ColumnMapper
- **Features**: Drag-and-drop, CSV/Excel support, preview

### 3. Enrichment
- **Layout**: Progress stepper + feature cards
- **Components**: ProgressBar, FeatureCard, StatusIndicator
- **Features**: Real-time progress, auto-enrichment

### 4. Competitors
- **Layout**: Map view + competitor cards
- **Components**: InteractiveMap, CompetitorCard, PriceChart
- **Features**: Auto-discovery, price monitoring

### 5. Insights
- **Layout**: Filters + grid of visualizations
- **Components**: FilterBar, BoxPlot, Heatmap, ScatterPlot
- **Features**: Interactive charts, date range filters

### 6. Model Training
- **Layout**: Algorithm selector + training status
- **Components**: AlgorithmCard, TrainingProgress, MetricsDisplay
- **Features**: Model comparison, performance metrics

### 7. Optimize
- **Layout**: Scenario builder + recommendations
- **Components**: ScenarioBuilder, RecommendationCard, PriceSlider
- **Features**: What-if analysis, export recommendations

### 8. Settings
- **Layout**: Tabbed settings panel
- **Components**: SettingsCard, Form, Toggle
- **Features**: Business profile, preferences

## 🌗 Light/Dark Mode

### Implementation Strategy
- Use Tailwind's dark mode (class strategy)
- Store preference in localStorage
- Toggle component in header
- Smooth theme transitions (200ms)

### Color Adjustments
```css
/* Light Mode */
background: white
card: #F9FAFB
text: #111827

/* Dark Mode */
background: #0A0A0A
card: #1A1A1A
text: #FAFAFA
```

## 🎬 Animations (Framer Motion)

### Page Transitions
```typescript
variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}
```

### Micro-interactions
- Button hover: scale(1.02) + shadow
- Card hover: translateY(-2px) + shadow
- Input focus: border glow
- Loading states: skeleton screens

## 📦 Dependencies

### Core
- react ^18.3.0
- react-dom ^18.3.0
- react-router-dom ^6.22.0
- typescript ^5.4.0

### UI/Styling
- tailwindcss ^3.4.0
- @headlessui/react ^2.0.0 (accessible components)
- lucide-react ^0.344.0 (icons)
- framer-motion ^11.0.0 (animations)

### Charts
- recharts ^2.12.0

### State Management
- zustand ^4.5.0

### API/Data
- axios ^1.6.0
- react-query ^5.0.0

### Forms
- react-hook-form ^7.50.0
- zod ^3.22.0 (validation)

### Utils
- clsx ^2.1.0 (conditional classes)
- date-fns ^3.3.0

## 🚀 Getting Started

### 1. Initialize Project
```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install
```

### 2. Install Dependencies
```bash
npm install tailwindcss postcss autoprefixer
npm install react-router-dom zustand axios react-query
npm install recharts framer-motion lucide-react
npm install @headlessui/react clsx date-fns
npm install react-hook-form zod
```

### 3. Configure Tailwind
```bash
npx tailwindcss init -p
```

### 4. Run Development Server
```bash
npm run dev  # Frontend on :5173
```

### 5. Run Backend API
```bash
cd ../
python backend/app.py  # Backend on :5000
```

## 🎯 Development Phases

### Phase 1: Foundation (Week 1)
- ✅ Project setup
- ✅ Design system configuration
- ✅ Core UI components (Button, Input, Card)
- ✅ Layout components (Sidebar, Header)
- ✅ Routing setup

### Phase 2: Backend API (Week 2)
- ✅ Flask app structure
- ✅ Data upload endpoints
- ✅ Enrichment endpoints
- ✅ CORS configuration
- ✅ Error handling

### Phase 3: Core Pages (Week 3-4)
- ✅ Dashboard with real data
- ✅ Data Upload page
- ✅ Enrichment page
- ✅ Settings page

### Phase 4: Advanced Features (Week 5-6)
- ✅ Insights page with charts
- ✅ Competitors page
- ✅ Model training page
- ✅ Optimize page

### Phase 5: Polish (Week 7)
- ✅ Light/dark mode
- ✅ Animations
- ✅ Error boundaries
- ✅ Loading states
- ✅ Mobile responsiveness

### Phase 6: Testing & Deploy (Week 8)
- ✅ Unit tests
- ✅ E2E tests
- ✅ Performance optimization
- ✅ Production build

## 📱 Responsive Breakpoints

```javascript
screens: {
  'sm': '640px',   // Mobile landscape
  'md': '768px',   // Tablet
  'lg': '1024px',  // Desktop
  'xl': '1280px',  // Large desktop
  '2xl': '1536px'  // Ultra-wide
}
```

## ♿ Accessibility

- All interactive elements keyboard accessible
- ARIA labels on all icons/buttons
- Focus indicators visible
- Color contrast WCAG AA compliant
- Screen reader friendly

## 🔒 Security

- API authentication (JWT tokens)
- Input sanitization
- CORS properly configured
- Environment variables for secrets
- No sensitive data in frontend

## 📈 Performance

- Code splitting by route
- Lazy loading for charts
- Image optimization
- Bundle size monitoring
- Lighthouse score > 90
