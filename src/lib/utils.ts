import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS class names, resolving conflicting utilities so the last one wins.
 * Standard shadcn/ui helper used throughout the component library.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
