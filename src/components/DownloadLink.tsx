import { useEffect, useState, type ReactNode } from "react";

/** A native user-activated link avoids synthetic-click download restrictions. */
export function DownloadLink({
  name,
  content,
  type,
  children,
}: {
  name: string;
  content: string;
  type: string;
  children: ReactNode;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(new Blob([content], { type }));
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [content, type]);
  return (
    <a
      className="button secondary"
      href={url || undefined}
      download={name}
      aria-disabled={!url || undefined}
    >
      {children}
    </a>
  );
}
