# LotteryTools Project Context

This document provides essential information for AI agents and developers working on the **LotteryTools** project.

## Project Overview
LotteryTools is a professional web application designed for optimizing and analyzing lottery combinations, specifically targeting **Double Color Ball (SSQ)** and **Super Lotto (DLT)**. It employs combinatorial algorithms and game theory to help users reduce betting costs and identify unpopular number combinations.

### Key Technologies
- **Framework:** Next.js 16 (App Router)
- **Library:** React 19
- **Language:** TypeScript
- **Database:** Browser-based IndexedDB (via `src/lib/storage.ts`)
- **Styling:** Tailwind CSS 4
- **Icons:** Lucide React

## Core Architecture
- **App Router (`src/app`):** Handles all pages and API routes.
- **Business Logic (`src/lib/combinations.ts`):** Contains the core algorithms for combination generation, filtering, and wheeling systems (Rotation Matrix).
- **Storage Layer (`src/lib/storage.ts`):** IndexedDB wrapper for persisting data in the browser.
- **Components (`src/components`):** Reusable UI components like `BallPicker`, `Cart`, and `Sidebar`.

## Main Features
1.  **Combination Reducer (`/reducer`):** 
    - Uses "Rotation Matrix" (Wheeling System) algorithms (e.g., Match 6 Guarantee 5).
    - Supports advanced filtering (Sum, Consecutive numbers, Odd/Even ratios).
    - Allows saving optimized combinations to the browser's IndexedDB.
2.  **Reverse/Heatmap Analysis (`/reverse`):**
    - Analyzes historical draw frequencies (fetches from external API via `/api/history`).
    - Implements **Game Theory** algorithms to suggest "unpopular" numbers (e.g., avoiding birthday numbers 1-31) to maximize expected value.
3.  **Saved Schemes (`/saved`):**
    - A dashboard to view and manage previously generated and saved combinations stored in IndexedDB.

## Development Guide

### Building and Running
- **Install dependencies:** `pnpm install`
- **Development server:** `pnpm run dev`
- **Build for production:** `pnpm run build`
- **Start production server:** `pnpm run start`
- **Linting:** `pnpm run lint`

### Coding Conventions
- **Core Algorithms:** New lottery logic or filters should be added to `src/lib/combinations.ts`.
- **API Routes:** Follow the Next.js Route Handler pattern in `src/app/api/[feature]/route.ts`.
- **State Management:** Uses standard React hooks (`useState`, `useReducer`) and IndexedDB storage helpers (`src/lib/storage.ts`).
- **Styling:** Adhere to Tailwind CSS 4 utility classes and follow the **Modern Vibrant** design system documented below.

## UI Style Guide (Modern Vibrant)
The application follows a premium, data-driven "Modern Vibrant" (方案 C) aesthetic characterized by glassmorphism, bold typography, and strategic use of gradients.

### Core Visual Principles
- **Glassmorphism:** Use semi-transparent backgrounds (`bg-white/70` or `bg-white/80`) combined with high backdrop blur (`backdrop-blur-xl` to `backdrop-blur-2xl`) and subtle white borders.
- **Dynamic Backgrounds:** Pages should feature soft, large background gradient blobs (e.g., `bg-blue-100/50`, `bg-emerald-50`) with high blur (`blur-3xl`) to create depth.
- **Shadows:** Utilize deep, soft shadows (`shadow-xl` or custom `shadow-[0_20px_50px_rgba(0,0,0,0.1)]`) instead of hard borders.
- **Typography:** Titles use `font-black` with `tracking-tight`. Gradient text (`bg-clip-text text-transparent bg-gradient-to-r`) is preferred for main headings.

### Color System (Functional Coding)
- **Global Background:** `bg-slate-50`.
- **Combination Reducer:** Emerald/Teal (`from-emerald-400 to-teal-500`).
- **Smart Random:** Orange/Amber (`from-orange-400 to-amber-500`).
- **Reverse Analysis:** Rose/Pink (`from-rose-400 to-pink-500`).
- **Saved Schemes:** Indigo/Blue (`from-indigo-500 to-blue-600`).
- **Desktop Sidebar:** Premium Dark (`bg-slate-950`).

### Component Standards
- **Cards:** Large border radius (`rounded-3xl` or `rounded-[40px]`). Hover state: `hover:-translate-y-2` with enhanced shadow.
- **Buttons:** Primary buttons use vibrant gradients, `font-black`, and `rounded-2xl` or `rounded-3xl`.
- **Mobile Navigation:** "Floating Dock" style — capsule-shaped, detached from screen edges, high elevation shadow.
- **Interactive States:** Icons should scale on hover (`hover:scale-110`). Tactile feedback on click (`active:scale-95`).

## Data Models
Data is stored in IndexedDB with two main stores:
- `saved_combinations`: Stores type, red/blue numbers, tool used, and timestamp.
- `cart_combinations`: Stores temporary selections for the cart.

## Notes
- The "Rotation Matrix" calculation can be CPU-intensive for large number pools (>16 numbers); optimizations or limits should be maintained.
- Number strings are stored as comma-separated strings (e.g., "01,02,03,04,05,06").
