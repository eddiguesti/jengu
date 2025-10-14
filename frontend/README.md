# Jengu Dynamic Pricing - React Frontend

## 🎉 Phase 1 Complete!

A premium React + TailwindCSS frontend with:
✅ Complete routing system (9 pages)
✅ Premium UI components (Button, Card, Input)
✅ Responsive sidebar navigation
✅ Beautiful Dashboard with animated KPI cards
✅ Dark theme with Lime (#EBFF57) accent
✅ Framer Motion animations
✅ Modern layout system

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

Your app will be running at: **http://localhost:5173**

## 📁 What's Been Built

### Configuration Files ✅
- `package.json` - All dependencies
- `tailwind.config.js` - Premium design system
- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript setup
- `postcss.config.js` - PostCSS for Tailwind

### Core Application ✅
- `src/main.tsx` - Entry point
- `src/App.tsx` - Router configuration
- `src/index.css` - Global styles

### UI Components ✅
- `src/components/ui/Button.tsx` - Button component (4 variants, 3 sizes)
- `src/components/ui/Card.tsx` - Card container with Header/Body/Footer
- `src/components/ui/Input.tsx` - Form input with label/error/helper

### Layout ✅
- `src/components/layout/Sidebar.tsx` - Navigation sidebar with Jengu branding
- `src/components/layout/Layout.tsx` - Main layout wrapper

### Pages ✅
- `src/pages/Dashboard.tsx` - Premium dashboard with KPIs and quick actions
- `src/pages/DataUpload.tsx` - Data upload interface
- `src/pages/Enrichment.tsx` - Enrichment page placeholder
- `src/pages/index.tsx` - All other page placeholders

## 🎨 Design System

### Colors
```javascript
primary: '#EBFF57'      // Lime green
background: '#0A0A0A'   // Deep black
card: '#1A1A1A'         // Card background
elevated: '#242424'     // Hover/elevated states
border: '#2A2A2A'       // Borders
text: '#FAFAFA'         // Primary text
muted: '#9CA3AF'        // Secondary text
```

### Typography
- Font: Inter (Google Fonts)
- Weights: 400, 500, 600, 700, 800
- Monospace: JetBrains Mono

## 📦 Tech Stack

- **React 18.3** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **React Router** - Routing
- **Framer Motion** - Animations
- **Lucide React** - Icons
- **clsx** - Conditional classes

## 🧱 Component Usage

### Button
```tsx
import { Button } from './components/ui/Button'

<Button variant="primary" size="md">
  Click Me
</Button>

// Variants: primary, secondary, ghost, danger
// Sizes: sm, md, lg
// Props: loading, disabled
```

### Card
```tsx
import { Card } from './components/ui/Card'

<Card variant="elevated">
  <Card.Header>
    <h3>Title</h3>
  </Card.Header>
  <Card.Body>
    Content here
  </Card.Body>
  <Card.Footer>
    Actions here
  </Card.Footer>
</Card>
```

### Input
```tsx
import { Input } from './components/ui/Input'

<Input
  label="Email"
  type="email"
  placeholder="Enter email"
  error="Invalid email"
  helperText="We'll never share your email"
/>
```

## 🚧 Next Steps (Phase 2)

Build these in the next session:
- [ ] Complete Data Upload page with file handling
- [ ] Enrichment page with progress tracking
- [ ] Insights page with Recharts visualizations
- [ ] Competitors page
- [ ] Flask API backend integration
- [ ] State management with Zustand
- [ ] API service layer

## 📝 Development Commands

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## 🎯 Features

### Current (Phase 1)
✅ Responsive layout with sidebar
✅ 9 routed pages
✅ Premium UI components
✅ Smooth animations
✅ Dark theme
✅ TypeScript support

### Coming in Phase 2
- Full-featured Data Upload with drag-and-drop
- Interactive charts (Recharts)
- API integration
- State management
- Form validation
- Loading states
- Error boundaries

### Coming in Phase 3+
- Enrichment progress tracking
- Competitor map integration
- ML model training UI
- Price optimization interface
- Light/dark mode toggle
- Settings page with forms

## 🐛 Troubleshooting

### "Cannot find module"
Run `npm install` to install all dependencies

### Port 5173 already in use
Stop the existing dev server or use a different port:
```bash
npm run dev -- --port 3000
```

### Tailwind classes not working
1. Restart dev server
2. Check `tailwind.config.js` includes `./src/**/*.{js,ts,jsx,tsx}`

## 📚 Resources

- [Vite Docs](https://vitejs.dev/)
- [React Router](https://reactrouter.com/)
- [TailwindCSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Lucide Icons](https://lucide.dev/)

## 🎨 Design Inspiration

The UI is inspired by premium tools like:
- Notion (clean cards, typography)
- Linear (smooth animations, minimal)
- Stripe (premium feel, whitespace)

---

Built with ❤️ for Jengu Dynamic Pricing Platform
