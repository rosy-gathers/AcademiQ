"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export default function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) return null;

  return (
    <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 flex items-start gap-3">
      <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
      <p>
        You are offline. Open{" "}
        <a href="/saved" className="font-medium text-accent hover:underline">
          Saved for later
        </a>{" "}
        to read lectures you saved on this device.
      </p>
    </div>
  );
}
