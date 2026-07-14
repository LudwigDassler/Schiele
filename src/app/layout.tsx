import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import LoadingScreen from "@/components/LoadingScreen";  // ← это должно быть

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SCHIELE - Visual Discovery",
  description: "Галерея вдохновения",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <LoadingScreen />  {/* ← это должно быть */}
        {children}
      </body>
    </html>
  );
}