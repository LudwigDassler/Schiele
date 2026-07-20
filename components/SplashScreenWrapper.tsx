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
    // Splash is skipped for returning visitors; sessionStorage is only available on the client.
    if (sessionStorage.getItem("schiele_visited")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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