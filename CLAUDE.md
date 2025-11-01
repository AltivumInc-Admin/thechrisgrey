# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal website for Christian Perez (@thechrisgrey) - Founder & CEO of Altivum Inc., former Green Beret (18D), host of The Vector Podcast, and author of "Beyond the Assessment". Built with React + TypeScript + Vite, styled with Tailwind CSS, deployed on AWS Amplify.

## Development Commands

**Local Development:**
```bash
npm run dev          # Start dev server at http://localhost:5173
npm run build        # TypeScript compile + production build (outputs to dist/)
npm run preview      # Preview production build locally
npm run lint         # Run ESLint on TypeScript files
```

**Deployment:**
- Pushing to `main` branch automatically triggers AWS Amplify deployment
- Amplify uses `amplify.yml` configuration (runs `npm ci` then `npm run build`)
- Build artifacts from `dist/` directory are deployed

## Architecture

### Routing & Layout
- React Router v6 with client-side routing
- Global layout in `App.tsx`: `<Navigation>` → `<Routes>` → `<Footer>`
- 7 main routes: `/` (Home), `/about`, `/altivum`, `/podcast`, `/blog`, `/links`, `/contact`

### Design System (Tailwind)

**Custom Color Palette** (defined in `tailwind.config.js`):
- `altivum-dark`: #0A0F1C (backgrounds)
- `altivum-navy`: #1A2332 (cards, nav)
- `altivum-blue`: #2E4A6B (accents)
- `altivum-slate`: #4A5A73
- `altivum-silver`: #9BA6B8 (body text)
- `altivum-gold`: #C5A572 (highlights, CTAs)

**Typography:**
- `font-sans`: Inter (body text)
- `font-serif`: Playfair Display (headings)
- `font-display`: Montserrat (logo, display text)
- Google Fonts + Material Icons loaded via CDN in `index.html`

**Custom Animations:**
- `animate-fade-in`: Hero section entrance (1.2s delay)
- `animate-nav-fade-in`: Navigation delayed entrance (0.8s with 1s delay)
- Defined as Tailwind keyframes in `tailwind.config.js`

### Home Page Scroll Experience

The Home page (`src/pages/Home.tsx`) features a sophisticated scroll-based animation system:

**Structure:**
1. **Hero Section (100vh)**: Static hero image with fade-in animation
2. **Summary Section (300vh)**: Sticky profile image with scroll-triggered key points
3. **Remaining Sections**: Standard content (Key Pillars, Featured Book, CTA)

**Summary Section Mechanics:**
- Profile image is `position: sticky` inside a `300vh` tall container
- 4 key points fade in from left as user scrolls, appearing at 50vh intervals:
  - 0vh: "Founder & CEO | Altivum Inc"
  - 50vh: "Host | The Vector Podcast"
  - 100vh: "Author | Beyond the Assessment"
  - 150vh: "Former Green Beret | 18D"
- After 150vh, all points remain visible for final 150vh of scroll
- Scroll progress tracked via `useState` + `useEffect` scroll listener
- Key points styled as left-aligned tabs with `border-l-4 border-altivum-gold`

**Navigation Transparency:**
- Nav bar stays transparent through hero + summary sections (400vh total)
- Becomes solid (`bg-altivum-navy/95 backdrop-blur-md`) after scrolling past summary
- Threshold: `window.innerHeight * 4` in `Navigation.tsx`

### Component Patterns

**Icons:**
- Use Google Material Icons via `<span className="material-icons">icon_name</span>`
- Brand logos (social media) use inline SVG paths
- NO custom icon components or libraries

**Images:**
- Assets stored in `src/assets/`
- Import and use: `import heroImage from '../assets/hero2.png'`
- Large images: profile photos, hero banners, featured content
- Small images: QR codes, logos

**Responsive Design:**
- Mobile-first approach with Tailwind breakpoints (`md:`, `lg:`)
- Mobile menu toggle in `Navigation.tsx` (hamburger icon shows/hides on `md:hidden`)
- Grid layouts: single column mobile → multi-column desktop

## Key Files

- `tailwind.config.js`: Custom colors, fonts, animations
- `src/components/Navigation.tsx`: Fixed nav with scroll-based transparency
- `src/pages/Home.tsx`: Complex scroll animations and sticky sections
- `amplify.yml`: AWS Amplify build configuration
- `index.html`: Font/icon CDN links, favicon reference

## Deployment Notes

- **Never commit** `node_modules/` or `dist/` (in `.gitignore`)
- Assets in `public/` are copied to dist root (e.g., `public/tcg.png` → `/tcg.png`)
- Vite bundles `src/assets/` imports with cache-busting hashes
- Build must succeed (`npm run build`) before deploying
