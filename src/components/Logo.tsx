import { Flower2 } from "lucide-react";
export function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand ${small ? "small" : ""}`}>
      <span className="brand-mark">
        <Flower2 size={25} strokeWidth={1.5} />
      </span>
      {!small && (
        <span>
          gatherly<span className="brand-dot">.</span>
        </span>
      )}
    </span>
  );
}
