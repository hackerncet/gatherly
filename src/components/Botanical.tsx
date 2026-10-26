export function Botanical({ variant = "hero" }: { variant?: string }) {
  return (
    <svg
      className={`botanical ${variant}`}
      viewBox="0 0 360 280"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M186 275C165 214 187 140 233 63M190 226C137 176 100 153 64 125M177 206C209 177 251 162 304 151"
        stroke="currentColor"
        strokeWidth="2"
      />
      <g fill="currentColor" opacity=".32">
        <ellipse
          cx="218"
          cy="103"
          rx="13"
          ry="36"
          transform="rotate(35 218 103)"
        />
        <ellipse
          cx="189"
          cy="152"
          rx="13"
          ry="35"
          transform="rotate(-24 189 152)"
        />
        <ellipse
          cx="239"
          cy="172"
          rx="12"
          ry="36"
          transform="rotate(65 239 172)"
        />
        <ellipse
          cx="135"
          cy="180"
          rx="12"
          ry="33"
          transform="rotate(-50 135 180)"
        />
        <ellipse
          cx="92"
          cy="141"
          rx="12"
          ry="29"
          transform="rotate(-48 92 141)"
        />
        <ellipse
          cx="209"
          cy="212"
          rx="11"
          ry="26"
          transform="rotate(55 209 212)"
        />
      </g>
      <g stroke="currentColor" strokeWidth="1.5">
        <ellipse
          cx="239"
          cy="54"
          rx="20"
          ry="32"
          transform="rotate(22 239 54)"
        />
        <ellipse
          cx="260"
          cy="67"
          rx="19"
          ry="30"
          transform="rotate(68 260 67)"
        />
        <ellipse
          cx="219"
          cy="64"
          rx="18"
          ry="27"
          transform="rotate(-35 219 64)"
        />
        <ellipse
          cx="243"
          cy="78"
          rx="19"
          ry="27"
          transform="rotate(115 243 78)"
        />
        <circle cx="238" cy="69" r="8" />
        <ellipse
          cx="60"
          cy="117"
          rx="16"
          ry="25"
          transform="rotate(-40 60 117)"
        />
        <ellipse
          cx="76"
          cy="111"
          rx="15"
          ry="25"
          transform="rotate(15 76 111)"
        />
        <ellipse
          cx="64"
          cy="132"
          rx="16"
          ry="23"
          transform="rotate(80 64 132)"
        />
        <circle cx="69" cy="123" r="6" />
      </g>
      <path
        d="m292 60 3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8ZM119 47l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z"
        fill="currentColor"
      />
      <circle cx="306" cy="112" r="3" fill="currentColor" />
      <circle cx="117" cy="103" r="2" fill="currentColor" />
    </svg>
  );
}
