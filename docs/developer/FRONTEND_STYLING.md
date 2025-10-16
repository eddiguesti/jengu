# Frontend Styling & Design System

This document describes the Jengu frontend design system and styling patterns. Use this as a reference when working with React components, Tailwind CSS, and UI code.

## Overview

**Stack**: React 18 + TypeScript + Tailwind CSS + Framer Motion

**Approach**: Dark-first design with utility-first Tailwind classes. No CSS-in-JS or styled-components. Custom utilities defined in `index.css` for complex patterns.

## Color System

All colors defined in `frontend/tailwind.config.js`:

| Token | Value | Use Case |
|-------|-------|----------|
| `primary` | `#EBFF57` | CTAs, highlights, active states, accents (lime yellow) |
| `background` | `#0A0A0A` | Page/body background (deep black) |
| `card` | `#1A1A1A` | Card backgrounds, default surfaces |
| `elevated` | `#242424` | Elevated surfaces, hover states, secondary backgrounds |
| `border` | `#2A2A2A` | Borders, dividers, separators |
| `text` | `#FAFAFA` | Primary text (off-white) |
| `muted` | `#9CA3AF` | Secondary text, placeholders, disabled states |
| `success` | `#10B981` | Success states, positive indicators |
| `warning` | `#F59E0B` | Warning alerts, caution states |
| `error` | `#EF4444` | Error states, destructive actions |

**Theme**: Dark-dominant with high-contrast lime yellow primary. Uses subtle shade variations (card → elevated → border) to create visual hierarchy.

**Usage**:
- Always use semantic tokens (e.g., `bg-primary`, `text-error`)
- Never hardcode hex values in components
- Use opacity modifiers for variants: `bg-success/10`, `border-error/20`

## Typography

**Fonts** (from Tailwind config):
- Sans: Inter, system-ui, sans-serif
- Mono: JetBrains Mono, monospace

**Hierarchy**:
- H1: `text-4xl font-bold text-text`
- H2: `text-xl font-semibold text-text` (card headers)
- H3: `text-lg font-semibold text-text`
- Body: `text-base text-text` (default)
- Secondary: `text-sm text-muted` or `text-xs text-muted`
- Labels: `text-sm font-medium text-text`

**Global styles** (`index.css`):
```css
h1, h2, h3, h4, h5, h6 {
  @apply font-semibold tracking-tight;
}
```

## Spacing & Layout

**Page Container** (from `Layout.tsx`):
- Main content: `p-8` with `max-w-7xl mx-auto`
- Card padding: `p-6` (consistent across all cards)

**Spacing Conventions**:
- Major sections: `space-y-8` (32px vertical gap)
- Component groups: `space-y-4` or `gap-4-6`
- Internal padding: `p-4` (medium), `p-6` (large)
- Internal gaps: `gap-2` (tight), `gap-3-4` (normal)

**Responsive Grid Patterns**:
```typescript
// KPI cards (4 columns)
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6

// Charts (2 columns)
grid grid-cols-1 lg:grid-cols-2 gap-6

// 3-column layout
grid grid-cols-1 md:grid-cols-3 gap-6
```

## Shadows & Elevation

Custom shadow system (from Tailwind config):
- `shadow-card`: Subtle shadows on cards (`0 2px 8px rgba(0,0,0,0.1)`)
- `shadow-card-hover`: Elevated on hover (`0 8px 24px rgba(0,0,0,0.15)`)
- `shadow-elevated`: Modals, dropdowns (`0 12px 32px rgba(0,0,0,0.2)`)

**Usage**: Apply on hover for interactive elements:
```typescript
className="hover:shadow-card-hover transition-all duration-300"
```

## Animations & Motion

**Keyframe Animations** (`index.css`):
- `animate-fade-in`: 0.3s fade (opacity 0 → 1)
- `animate-slide-up`: 0.3s slide + fade (translateY 20px)

**Accessibility**: Respects `prefers-reduced-motion` (animations reduced to 0.01ms).

**Framer Motion Patterns**:
```typescript
// Page transitions
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>

// Staggered list items (KPI cards)
transition={{ delay: 0.1 * index }}

// Modal animations
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.95 }}
```

**Hover Effects**:
- Cards: `hover:shadow-card-hover transition-all duration-300`
- Buttons: `transition-all duration-200`
- Icons: `group-hover:scale-110 transition-transform`

## Base UI Components

Components located in `frontend/src/components/ui/`. All use `clsx` for conditional class merging.

### Button
**Location**: `Button.tsx`

**Props**: `variant`, `size`, `loading`, `disabled`

**Variants**:
- `primary`: `bg-primary text-background` (lime on black)
- `secondary`: `bg-elevated border border-border`
- `ghost`: `bg-transparent hover:bg-elevated`
- `danger`: `bg-error text-white`

**Sizes**:
- `sm`: `px-3 py-1.5 text-sm`
- `md`: `px-4 py-2 text-base` (default)
- `lg`: `px-6 py-3 text-lg`

**States**:
- Loading: Shows spinner icon (`Loader2` from lucide-react)
- Disabled: `opacity-50 cursor-not-allowed`

### Card
**Location**: `Card.tsx`

**Variants**:
- `default`: `bg-card border border-border`
- `elevated`: `bg-elevated shadow-card hover:shadow-card-hover`

**Compound Components**:
- `Card.Header`: Semantic header section
- `Card.Body`: Main content section
- `Card.Footer`: Footer/actions section

**Pattern**: All cards use `rounded-xl` and `p-6` padding.

### Input
**Location**: `Input.tsx`

**Features**: Integrated label, error state, helper text

**Styling**:
- Base: `bg-elevated border border-border rounded-lg`
- Focus: `focus:ring-2 focus:ring-primary focus:border-transparent`
- Error: `border-error focus:ring-error`
- Placeholder: `placeholder:text-muted`

**Usage**:
```typescript
<Input
  label="Property Name"
  error="Required field"
  helperText="Enter your property name"
/>
```

### Select
**Location**: `Select.tsx`

**Pattern**: Similar to Input with custom chevron icon overlay. Uses `appearance-none` to hide native dropdown.

**Styling**: Same focus ring pattern as Input (`ring-2 ring-primary/50 focus:border-primary`).

### Badge
**Location**: `Badge.tsx`

**Props**: `variant`, `size`

**Variants**:
- `default`: Opaque bg with border
- `success/warning/error/info/primary`: Semi-transparent bg with matching border
  ```typescript
  // Example: success badge
  bg-success/10 text-success border border-success/20
  ```

**Sizes**: `sm`, `md`, `lg` (pill-shaped with `rounded-full`)

### Modal
**Location**: `Modal.tsx`

**Features**:
- AnimatePresence for smooth entry/exit
- Backdrop: `fixed inset-0 bg-black/60 backdrop-blur-sm`
- Content: `max-w-*` sizing (sm/md/lg/xl), `rounded-2xl`
- Animations: Scale + fade + translateY
- Keyboard: Escape to close, body overflow hidden

**Compound Components**:
- `Modal.Body`: Main content
- `Modal.Footer`: Action buttons

### Progress
**Location**: `Progress.tsx`

**Props**: `value` (0-100), `size`, `variant`, `showLabel`

**Styling**:
- Container: `bg-elevated rounded-full`
- Fill: Animated width with `transition-all duration-300 ease-out`
- Variants use semantic colors (primary, success, warning, error)

### Table
**Location**: `Table.tsx`

**Compound Components**: `Table.Header`, `Table.Body`, `Table.Row`, `Table.HeaderCell`, `Table.Cell`

**Styling**:
- Header: `bg-elevated border-b border-border`
- Rows: `border-b border-border` with `hover:bg-elevated` on clickable rows
- Cells: `px-4 py-3`
- Wrapper: `overflow-x-auto` for responsiveness

## Forms & Inputs

**Input Pattern**:
```typescript
bg-elevated border border-border rounded-lg
focus:ring-2 focus:ring-primary focus:border-transparent
placeholder:text-muted
transition-all duration-200
```

**Form Spacing**:
- Between sections: `space-y-6`
- Label to input: `mb-1.5` or `mb-2`
- Helper text: `mt-1 text-xs text-muted`

**Error Handling**:
- Error state: `border-error focus:ring-error`
- Error message: `text-error text-sm mt-1`

## Custom Utilities

**Location**: `frontend/src/index.css`

**Range Slider**:
```css
input[type="range"].slider-thumb
// Custom thumb: 20x20px yellow (#EBFF57) with glow
// Track: gradient from primary to border
// Hover: scale-110 with enhanced glow
```

**Scrollbar Hiding**:
```css
.scrollbar-hide
// Hides scrollbars across all browsers (Chrome, Firefox, Safari)
```

## Dark Mode

**Implementation**: Class-based (`darkMode: 'class'` in Tailwind config)

**Current State**: Dark-first design. All colors optimized for dark theme. Light mode not implemented.

**Future**: To add light mode, toggle `dark` class on root element and define light variants.

## Development Conventions

1. **Always use Tailwind classes** - No inline styles or CSS modules
2. **Use `clsx` for conditionals** - Never template strings
3. **Follow variant pattern** - Object with variant keys for polymorphic components
4. **Use semantic tokens** - `primary`, `success`, etc. (not hex values)
5. **Compound components** - Break complex components into sub-components
6. **Consistent spacing** - Use Tailwind spacing scale (`px-4`, `mb-2`)
7. **Responsive-first** - Use breakpoint prefixes (`sm:`, `md:`, `lg:`)
8. **ForwardRef for inputs** - Input/Select use forwardRef for form libraries
9. **Check motion preferences** - Always respect `prefers-reduced-motion`
10. **Loading states** - Use `Loader2` icon with `animate-spin` consistently
11. **Accessibility** - Semantic HTML, ARIA labels, keyboard navigation
12. **Opacity modifiers** - Use `/10`, `/20`, `/50` for semantic variants

## Component Composition Pattern

Use compound components for complex UI:

```typescript
// Card
<Card variant="elevated">
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
  <Card.Footer>Actions</Card.Footer>
</Card>

// Modal
<Modal isOpen={isOpen} onClose={onClose}>
  <Modal.Body>Content</Modal.Body>
  <Modal.Footer>
    <Button onClick={onClose}>Close</Button>
  </Modal.Footer>
</Modal>

// Table
<Table>
  <Table.Header>
    <Table.Row>
      <Table.HeaderCell>Column</Table.HeaderCell>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    <Table.Row>
      <Table.Cell>Data</Table.Cell>
    </Table.Row>
  </Table.Body>
</Table>
```

## File Structure

```
frontend/
├── tailwind.config.js        # Custom colors, shadows, animations
├── src/
│   ├── index.css             # Global styles, keyframes, utilities
│   ├── components/
│   │   ├── ui/               # Base design system (Button, Card, etc.)
│   │   └── layout/           # Layout components (Sidebar, Layout)
│   └── pages/                # Feature pages using base components
```

## Known Issues

**Login Page Inconsistency**: `Login.tsx` uses different colors (slate palette, cyan/blue gradients) instead of main design system. Should be migrated to use custom color tokens for consistency.

## Quick Reference

**Primary Action**: `bg-primary text-background hover:bg-primary/90`

**Secondary Action**: `bg-elevated border border-border hover:bg-elevated/80`

**Danger Action**: `bg-error text-white hover:bg-error/90`

**Card**: `bg-card border border-border rounded-xl p-6`

**Input**: `bg-elevated border border-border rounded-lg focus:ring-2 focus:ring-primary`

**Success Badge**: `bg-success/10 text-success border border-success/20 rounded-full`

**Page Animation**: `initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}`

---

**For architectural patterns and data flow, see `ARCHITECTURE.md`.**
