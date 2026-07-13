"use client";
import { useState, useEffect } from "react";
import SplashScreen from "./SplashScreen";

interface SplashScreenWrapperProps {
  children: React.ReactNode;
  variant?: "schiele" | "ledzeppelin";
}

export default function SplashScreenWrapper({ 
  children, 
  variant = "schiele"
}: SplashScreenWrapperProps) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const hasVisited = sessionStorage.getItem("schiele_visited");
    if (hasVisited) {
      setShowSplash(false);
    }
  }, []);

  const handleComplete = () => {
    setShowSplash(false);
    sessionStorage.setItem("schiele_visited", "true");
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleComplete} variant={variant} />;
  }

  return <>{children}</>;
}