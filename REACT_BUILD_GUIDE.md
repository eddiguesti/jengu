# Complete React + TailwindCSS Build Guide for Jengu

## 🚀 Quick Start (5 Minutes)

### 1. Install Dependencies
```bash
cd c:\Users\eddgu\travel-pricing\frontend
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Frontend will run at: http://localhost:5173

### 3. Start Flask Backend (separate terminal)
```bash
cd c:\Users\eddgu\travel-pricing
python backend/app.py
```
Backend API will run at: http://localhost:5000

---

## 📁 Complete File Structure Created

I've created the essential files for you. Here's what's included:

### Configuration Files ✅
- `package.json` - All dependencies configured
- `tailwind.config.js` - Premium design system
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite build configuration
- `postcss.config.js` - PostCSS for Tailwind

### Core Application ✅
- `src/main.tsx` - Application entry point
- `src/App.tsx` - Main app with routing
- `src/index.css` - Global styles with Tailwind

### UI Component Library ✅
- `src/components/ui/Button.tsx` - Premium button component
- `src/components/ui/Input.tsx` - Form input component
- `src/components/ui/Card.tsx` - Card container component
- `src/components/ui/Modal.tsx` - Accessible modal dialog

### Layout Components ✅
- `src/components/layout/Sidebar.tsx` - Navigation sidebar
- `src/components/layout/Header.tsx` - Top header bar
- `src/components/layout/Layout.tsx` - Main layout wrapper

### Pages ✅
- `src/pages/Dashboard.tsx` - Overview dashboard
- `src/pages/DataUpload.tsx` - Data upload page
- `src/pages/Insights.tsx` - Insights with charts
- `src/pages/Settings.tsx` - Settings page

### Services ✅
- `src/services/api.ts` - Axios API client
- `src/services/dataService.ts` - Data upload API calls

### State Management ✅
- `src/store/useStore.ts` - Zustand global state

### Types ✅
- `src/types/index.ts` - TypeScript type definitions

### Backend API ✅
- `backend/app.py` - Flask REST API server
- `backend/api/data.py` - Data endpoints
- `backend/requirements.txt` - Python dependencies

---

## 🎨 Design System

### Colors
```javascript
colors: {
  primary: '#EBFF57',        // Lime
  background: '#0A0A0A',     // Deep black
  card: '#1A1A1A',           // Card background
  elevated: '#242424',       // Hover states
  border: '#2A2A2A',         // Borders
  text: '#FAFAFA',           // Primary text
  muted: '#9CA3AF',          // Secondary text
}
```

### Typography
- **Headings**: font-bold, tracking-tight
- **Body**: font-normal, leading-relaxed
- **Font**: Inter (via Google Fonts CDN)

### Spacing
- Consistent 4px, 8px, 16px, 24px, 32px, 48px, 64px scale
- Generous whitespace between sections
- Card padding: 24px (lg)

---

## 🧱 Component Usage Examples

### Button Component
```tsx
import { Button } from './components/ui/Button';

// Primary button
<Button variant="primary" size="md">
  Upload Data
</Button>

// Secondary button
<Button variant="secondary" size="md">
  Cancel
</Button>

// Ghost button
<Button variant="ghost" size="sm">
  Learn More
</Button>

// With icon
<Button variant="primary" size="md">
  <Upload className="w-4 h-4 mr-2" />
  Upload File
</Button>

// Loading state
<Button variant="primary" loading>
  Processing...
</Button>
```

### Input Component
```tsx
import { Input } from './components/ui/Input';

<Input
  label="Business Name"
  type="text"
  placeholder="Enter your business name"
  value={name}
  onChange={(e) => setName(e.target.value)}
  error={errors.name}
  helperText="This will appear on reports"
/>
```

### Card Component
```tsx
import { Card } from './components/ui/Card';

<Card variant="elevated">
  <Card.Header>
    <h3 className="text-lg font-semibold">Total Bookings</h3>
  </Card.Header>
  <Card.Body>
    <p className="text-3xl font-bold">3,972</p>
    <p className="text-sm text-muted">+12.5% from last month</p>
  </Card.Body>
</Card>
```

### Modal Component
```tsx
import { Modal } from './components/ui/Modal';

<Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
  <Modal.Header>
    <h2>Confirm Upload</h2>
  </Modal.Header>
  <Modal.Body>
    <p>Are you sure you want to upload this file?</p>
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => setIsOpen(false)}>
      Cancel
    </Button>
    <Button variant="primary" onClick={handleUpload}>
      Confirm
    </Button>
  </Modal.Footer>
</Modal>
```

---

## 🔌 API Integration Example

### Uploading Data
```tsx
import { dataService } from '../services/dataService';

const handleUpload = async (file: File) => {
  try {
    const response = await dataService.uploadFile(file);
    console.log('Upload successful:', response.data);

    // Update global state
    useStore.getState().setUploadedData(response.data);

    // Navigate to next page
    navigate('/enrichment');
  } catch (error) {
    console.error('Upload failed:', error);
    toast.error('Failed to upload file');
  }
};
```

### Fetching Insights
```tsx
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const InsightsPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['insights'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:5000/api/insights');
      return response.data;
    }
  });

  if (isLoading) return <LoadingSpinner />;

  return <div>{/* Render insights */}</div>;
};
```

---

## 📄 Page Implementation Pattern

Each page follows this structure:

```tsx
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const DashboardPage = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-text">Dashboard</h1>
        <p className="text-muted mt-1">
          Real-time insights into your pricing performance
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric cards */}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart components */}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button variant="primary">Action</Button>
      </div>
    </motion.div>
  );
};
```

---

## 🎬 Animation Patterns

### Page Transitions
```tsx
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

<motion.div
  variants={pageVariants}
  initial="initial"
  animate="animate"
  exit="exit"
  transition={{ duration: 0.3 }}
>
  {/* Page content */}
</motion.div>
```

### Card Hover
```tsx
<motion.div
  whileHover={{ y: -2, boxShadow: '0 12px 24px rgba(0,0,0,0.15)' }}
  transition={{ duration: 0.2 }}
>
  <Card>...</Card>
</motion.div>
```

---

## 🌗 Light/Dark Mode Toggle

```tsx
import { useStore } from '../store/useStore';

const ThemeToggle = () => {
  const { theme, setTheme } = useStore();

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg hover:bg-elevated"
    >
      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
};
```

---

## 📊 Chart Integration (Recharts)

```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const PriceChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
        <XAxis dataKey="date" stroke="#9CA3AF" />
        <YAxis stroke="#9CA3AF" />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1A1A1A',
            border: '1px solid #2A2A2A',
            borderRadius: '8px'
          }}
        />
        <Line
          type="monotone"
          dataKey="price"
          stroke="#EBFF57"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
```

---

## 🔒 Protected Routes

```tsx
import { Navigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

const ProtectedRoute = ({ children }) => {
  const { hasProfile } = useStore();

  if (!hasProfile) {
    return <Navigate to="/settings" replace />;
  }

  return children;
};

// Usage in App.tsx
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  }
/>
```

---

## 🧪 Testing Your Build

### 1. Test Frontend Only (Mock Data)
```bash
cd frontend
npm run dev
```
Visit http://localhost:5173

### 2. Test with Backend API
Terminal 1:
```bash
cd backend
python app.py
```

Terminal 2:
```bash
cd frontend
npm run dev
```

### 3. Build for Production
```bash
cd frontend
npm run build
npm run preview
```

---

## 📦 Building More Components

When you need additional components, follow this pattern:

### 1. Create Component File
```tsx
// src/components/ui/Badge.tsx
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export const Badge = ({ children, variant = 'default' }: BadgeProps) => {
  const variants = {
    default: 'bg-elevated text-text',
    success: 'bg-green-500/10 text-green-500',
    warning: 'bg-yellow-500/10 text-yellow-500',
    error: 'bg-red-500/10 text-red-500',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};
```

### 2. Export from Index
```tsx
// src/components/ui/index.ts
export { Button } from './Button';
export { Input } from './Input';
export { Card } from './Card';
export { Badge } from './Badge';
```

### 3. Use in Pages
```tsx
import { Badge } from '../components/ui';

<Badge variant="success">Active</Badge>
```

---

## 🎯 Next Steps

1. **Run `npm install`** in the frontend directory
2. **Start the dev server** with `npm run dev`
3. **Explore the Dashboard** to see the premium UI
4. **Build additional pages** following the patterns above
5. **Connect to real backend** by implementing Flask endpoints
6. **Add more features** incrementally

---

## 💡 Tips for Success

- **Start with one page**: Get Dashboard working perfectly first
- **Reuse components**: Don't recreate - use the component library
- **Follow the patterns**: Consistency is key to premium feel
- **Test responsively**: Check mobile, tablet, desktop
- **Use the design system**: Stick to defined colors/spacing
- **Add animations gradually**: Don't overdo it

---

## 🐛 Troubleshooting

### "Cannot find module 'react'"
```bash
cd frontend
npm install
```

### CORS errors with backend
Add to Flask app.py:
```python
from flask_cors import CORS
CORS(app)
```

### Tailwind classes not working
```bash
npm run dev
# Restart the dev server
```

### TypeScript errors
Check `tsconfig.json` is properly configured

---

## 📚 Resources

- **Tailwind Docs**: https://tailwindcss.com/docs
- **React Router**: https://reactrouter.com
- **Framer Motion**: https://www.framer.com/motion
- **Recharts**: https://recharts.org
- **Headless UI**: https://headlessui.com

---

You now have everything you need to build a premium React + TailwindCSS frontend! 🚀

Start with `npm install` and `npm run dev`, then begin customizing from there.
