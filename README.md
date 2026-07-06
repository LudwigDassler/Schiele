# 🎨 Schiele — Pinterest-inspired Image Board

**Schiele** — это веб-приложение для поиска, сохранения и организации визуального контента: фотографий, мемов, произведений искусства, музыкантов, 
знаменитостей и исторических изображений. Проект вдохновлён Pinterest, но с упором на культуру, искусство и креативный контент.

---

## 🚀 Демо

🔗 **Живой сайт:** [https://schiele.onrender.com](https://schiele.onrender.com)

---

## ✨ Возможности

- 🔍 **Умный поиск** — по Wikipedia, Wikimedia Commons, Last.fm, The Met Museum и другим источникам
- 🖼 **Masonry-лента** — как в Pinterest
- 📌 **Сохранение в доски** — создавай свои коллекции
- 🔐 **Авторизация** — через Supabase (email + Google OAuth)
- 🎵 **Музыка** — поиск артистов через Last.fm API
- 🎨 **Искусство** — интеграция с Met Museum и Rijksmuseum
- 📱 **Адаптивный дизайн** — работает на всех устройствах
- 🧪 **Автотесты** — 15+ тестов с Vitest

---

## 🛠 Технологии

| Компонент | Технология |
|-----------|------------|
| **Фронтенд** | Next.js 16 (App Router), React, TypeScript |
| **Стили** | CSS-in-JS, адаптивный masonry-grid |
| **База данных** | Supabase (PostgreSQL) |
| **Авторизация** | Supabase Auth (Email + Google) |
| **API** | Next.js API Routes |
| **Тесты** | Vitest + React Testing Library |
| **Деплой** | Render |
| **Источники контента** | Unsplash, Pexels, Pixabay, Last.fm, Wikipedia, Wikimedia Commons, Met Museum, Rijksmuseum, Imgflip |

---

## 📂 Структура проекта
This is a 
[Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
