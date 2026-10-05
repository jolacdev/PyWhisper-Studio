# Development Notes

> **Last Updated:** 07-12-2025

This document contains development notes, design considerations, and implementation ideas for Syllentra.

---

## Frontend

### CSS

#### Color Palette

Consider the following neutral color palette from [Aceternity UI](https://ui.aceternity.com):

```css
--color-neutral-50: oklch(98.5% 0 0);
--color-neutral-100: oklch(97% 0 0);
--color-neutral-200: oklch(92.2% 0 0);
--color-neutral-300: oklch(87% 0 0);
--color-neutral-400: oklch(70.8% 0 0);
--color-neutral-500: oklch(55.6% 0 0);
--color-neutral-600: oklch(43.9% 0 0);
--color-neutral-700: oklch(37.1% 0 0);
--color-neutral-800: oklch(26.9% 0 0);
--color-neutral-900: oklch(20.5% 0 0);
--color-neutral-950: oklch(14.5% 0 0);
--color-black: #000;
--color-white: #fff;
```

#### Button Variants

Consider creating an outline-ghost button variant for secondary actions:

```css
.btn-outline {
  background-color: transparent;

  &.btn-primary {
    border-color: inherit;
    color: inherit;
  }

  &.btn-primary:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }
}
```

### ESLint

#### Tools & Configuration

- Use `@eslint/config-inspector` to debug ESLint flat config.

---

### Animations

https://motion.dev/docs/react-animate-presence
