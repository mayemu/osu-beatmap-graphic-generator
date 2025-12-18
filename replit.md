# osu! Beatmap Graphic Generator

## Overview
A React + TypeScript web application that generates aesthetic graphics/banners for osu! beatmaps. Users can paste an osu! beatmap link and customize the generated banner with various dimensions, color themes, fonts, and design elements.

## Project Architecture
- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS (CDN)
- **AI Integration**: Google Gemini API for generating taglines

## Key Files
- `App.tsx` - Main React application component
- `components/BannerPreview.tsx` - Banner preview component
- `services/gemini.ts` - Google Gemini API integration for tagline generation
- `services/osu.ts` - osu! beatmap data fetching from Nerinyan and Mino APIs
- `types.ts` - TypeScript type definitions
- `vite.config.ts` - Vite configuration with server settings

## Development
The dev server runs on port 5000 with hot module replacement.

```bash
npm run dev
```

## Environment Variables
- `API_KEY` - Google Gemini API key (optional, enables AI-generated taglines)

## Deployment
Static site deployment with `npm run build`, outputs to `dist/` directory.
