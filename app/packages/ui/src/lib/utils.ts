import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// tailwind-merge only knows Tailwind's default names, so it's told about the TekCert ones.
const merge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ['tag', 'field', 'card', 'pill'],
      shadow: ['raised', 'elevated'],
    },
  },
});

/** Joins class names; when two Tailwind utilities conflict, the later one wins. */
export function cn(...inputs: ClassValue[]): string {
  return merge(clsx(inputs));
}
