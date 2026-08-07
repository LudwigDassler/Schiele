"use client";
import { SessionProvider } from "next-auth/react";
// @ts-ignore
import GelbetLoader from "../components/GelbetLoader";
import { useState } from "react";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);

  return (
    <html lang="ru">
      <body>
        <SessionProvider>
          {loading ? <GelbetLoader onComplete={() => setLoading(false)} /> : children}
        </SessionProvider>
      </body>
    </html>
  );
}