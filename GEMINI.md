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
- **Install dependencies:** `npm install`
- **Development server:** `npm run dev`
- **Build for production:** `npm run build`
- **Start production server:** `npm run start`
- **Linting:** `npm run lint`

### Coding Conventions
- **Core Algorithms:** New lottery logic or filters should be added to `src/lib/combinations.ts`.
- **API Routes:** Follow the Next.js Route Handler pattern in `src/app/api/[feature]/route.ts`.
- **State Management:** Uses standard React hooks (`useState`, `useReducer`) and IndexedDB storage helpers (`src/lib/storage.ts`).
- **Styling:** Adhere to Tailwind CSS 4 utility classes.

## Data Models
Data is stored in IndexedDB with two main stores:
- `saved_combinations`: Stores type, red/blue numbers, tool used, and timestamp.
- `cart_combinations`: Stores temporary selections for the cart.

## Notes
- The "Rotation Matrix" calculation can be CPU-intensive for large number pools (>16 numbers); optimizations or limits should be maintained.
- Number strings are stored as comma-separated strings (e.g., "01,02,03,04,05,06").
