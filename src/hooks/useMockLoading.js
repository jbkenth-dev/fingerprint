import { useEffect, useState } from "react";

export function useMockLoading(delay = 900, resetKey = "default") {
  const [loading, setLoading] = useState(delay != null);

  useEffect(() => {
    if (delay == null) return;
    setLoading(true);
    const timer = window.setTimeout(() => setLoading(false), delay);
    return () => window.clearTimeout(timer);
  }, [delay, resetKey]);

  return loading;
}
