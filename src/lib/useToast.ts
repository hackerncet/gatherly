import { useCallback, useEffect, useRef, useState } from "react";
import type { Notify } from "./commands";

export type Toast = { message: string; tone: "success" | "error" };

/** The latest notification owns its timer; unmounting cancels pending UI work. */
export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = useCallback<Notify>((message, tone = "success") => {
    if (timer.current !== undefined) clearTimeout(timer.current);
    setToast({ message, tone });
    timer.current = setTimeout(() => setToast(null), 4500);
  }, []);
  useEffect(
    () => () => {
      if (timer.current !== undefined) clearTimeout(timer.current);
    },
    [],
  );
  return { toast, notify };
}
