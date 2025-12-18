# osu! Beatmap Graphic Generator

## Overview
A React + TypeScript web application that generates aesthetic graphics/banners for osu! beatmaps. Users can paste an osu! beatmap link and customize the generated banner with various dimensions, color themes, fonts, and design elements.

## Project Architecture
- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS (CDN)
- **Fonts**: Self-hosted via @fontsource packages (required for proper image export)
- **Image Export**: html-to-image with html2canvas fallback
- **AI Integration**: Google Gemini API for generating taglines

## Key Files
- `App.tsx` - Main React application component with download/export logic
- `components/BannerPreview.tsx` - Banner preview component
- `services/gemini.ts` - Google Gemini API integration for tagline generation
- `services/osu.ts` - osu! beatmap data fetching from Nerinyan and Mino APIs
- `types.ts` - TypeScript type definitions
- `index.tsx` - Entry point with @fontsource font imports
- `vite.config.ts` - Vite configuration with server settings

## Fonts
Fonts are self-hosted using @fontsource packages to ensure proper rendering when exporting banners to PNG. This is required because cross-origin fonts (like Google Fonts CDN) cannot be embedded by html-to-image/html2canvas libraries.

Supported fonts: Inter, Exo 2, Playfair Display, Roboto Mono, Montserrat, Oswald, Raleway, Permanent Marker, Lexend, Comfortaa, Poppins, Manrope

## Development
The dev server runs on port 5000 with hot module replacement.

```bash
npm run dev
```

## Environment Variables
- `API_KEY` - Google Gemini API key (optional, enables AI-generated taglines)

## Deployment
Static site deployment with `npm run build`, outputs to `dist/` directory.

## Recent Changes
- **Dec 2024**: Fixed banner download issue by switching from Google Fonts CDN to self-hosted @fontsource packages. This resolves text corruption in exported PNG files caused by cross-origin font access restrictions.
