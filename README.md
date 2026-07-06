# Schiele — Pinterest-style Image Board

Schiele is a web application for discovering, saving, and organizing visual content: photographs, memes, artworks, musicians, celebrities, and historical images. The project is inspired by Pinterest but focuses on culture, art, and creative content.

Demo: https://schiele.onrender.com

Features: smart search across Wikipedia, Wikimedia Commons, Last.fm, and The Met Museum. Masonry grid layout. Board-based pin saving. Authentication via Supabase (email + Google OAuth). Music discovery via Last.fm API. Art integration with Met Museum and Rijksmuseum. Fully responsive design. 28 automated tests.

Tech stack: Next.js 16 (App Router), React, TypeScript, CSS-in-JS, Supabase (PostgreSQL), Vitest, Render.

Project structure: app/ (api/auth, api/boards, api/creative, api/photos, api/pins, api/search, api/user, auth/, profile/), components/, lib/, __tests__/, public/.

Testing: 28 tests covering API endpoints (photos, search, creative), boards, pins, UI components, auth, home, profile. All tests pass. Run with npm test.

Setup: git clone https://github.com/LudwigDassler/Schiele.git, cd Schiele, npm install, cp .env.example .env.local, npm run dev.

Environment variables: NEXT_PUBLIC_UNSPLASH_ACCESS_KEY, NEXT_PUBLIC_PEXELS_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_LASTFM_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.

Author: LudwigDassler (https://github.com/LudwigDassler). License: MIT.
