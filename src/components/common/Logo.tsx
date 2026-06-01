import { cn } from "@/lib/utils";

/**
 * Guardian Litigation Group logo. Assets live in public/brand/ (see docs/brand-guidelines.md).
 * - variant "full": shield + wordmark; "shield": monogram only.
 * - tone "dark": white wordmark for dark/navy backgrounds; "light": charcoal wordmark.
 */
export function Logo({
  variant = "full",
  tone = "light",
  className,
}: {
  variant?: "full" | "shield";
  tone?: "light" | "dark";
  className?: string;
}) {
  const src =
    variant === "shield"
      ? "/brand/glg-shield.svg"
      : tone === "dark"
        ? "/brand/glg-full-dark.svg"
        : "/brand/glg-full-light.svg";
  return (
    <img
      src={src}
      alt="Guardian Litigation Group"
      className={cn("select-none", className)}
      draggable={false}
    />
  );
}
