"use client";

type Size = "xs" | "sm" | "md" | "lg";

const SIZE: Record<Size, number> = {
  xs: 22,
  sm: 28,
  md: 56,
  lg: 88,
};

interface Props {
  size?: Size;
  className?: string;
  priority?: boolean;
}

export default function BrandLogo({
  size = "md",
  className = "",
  priority = false,
}: Props) {
  const px = SIZE[size];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="GuessMyOrigin"
      width={px}
      height={px}
      className={`brand-logo brand-logo-${size} ${className}`.trim()}
      draggable={false}
      decoding="async"
      {...(priority ? { fetchPriority: "high" as const } : {})}
    />
  );
}
