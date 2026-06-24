import { useState, useRef } from "react";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 75;

export default function PullToRefresh({ onRefresh, children }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(null);
  const pulled = useRef(false);

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      pulled.current = false;
    }
  };

  const handleTouchMove = (e) => {
    if (startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > THRESHOLD) pulled.current = true;
  };

  const handleTouchEnd = async () => {
    if (pulled.current && !isRefreshing) {
      setIsRefreshing(true);
      pulled.current = false;
      startY.current = null;
      await onRefresh();
      setIsRefreshing(false);
    } else {
      startY.current = null;
      pulled.current = false;
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {isRefreshing && (
        <div className="flex items-center justify-center py-3 text-indigo-600 bg-indigo-50/70">
          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm font-medium">Refreshing…</span>
        </div>
      )}
      {children}
    </div>
  );
}