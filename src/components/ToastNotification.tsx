import { Check, CircleAlert } from "lucide-react";
import type { Toast } from "../lib/useToast";

export function ToastNotification({ toast }: { toast: Toast | null }) {
  const isError = toast?.tone === "error";
  return (
    <div
      className={`toast ${toast ? "visible" : ""}`}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
    >
      {toast && (
        <>
          {isError ? <CircleAlert size={17} /> : <Check size={17} />}
          {toast.message}
        </>
      )}
    </div>
  );
}
