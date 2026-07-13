"use client";
import { SessionProvider } from "next-auth/react";
import SplashScreenWrapper from "../components/SplashScreenWrapper";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <SessionProvider>
          <SplashScreenWrapper variant="schiele">
            {children}
          </SplashScreenWrapper>
        </SessionProvider>
      </body>
    </html>
  );
}