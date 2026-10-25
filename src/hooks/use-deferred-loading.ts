import { useEffect, useState } from "react";
import { MOTION } from "@/lib/motion";

/**
 * Só mostra loading depois de `delayMs`.
 * Se os dados chegarem antes, o skeleton/spinner não aparece.
 */
export function useDeferredLoading(
  isLoading: boolean,
  delayMs: number = MOTION.loadingDelayMs,
) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShow(false);
      return;
    }
    const timer = window.setTimeout(() => setShow(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [isLoading, delayMs]);

  return show;
}
