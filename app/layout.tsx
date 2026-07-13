"use client";
import { SessionProvider } from "next-auth/react";
import MetalLoader from "../components/MetalLoader";
import { useState, useEffect } from "react";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <html lang="ru">
      <body>
        <SessionProvider>
          {loading ? <MetalLoader /> : children}
        </SessionProvider>
      </body>
    </html>
  );
}