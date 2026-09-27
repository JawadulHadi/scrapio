# Scrapefix Design System

Scrapefix is a dark, "Midnight Indigo" developer tool aesthetic: deep indigo surfaces, a glowing indigo-to-violet primary, and Syne/Plus Jakarta Sans/JetBrains Mono typography. The system ships as a Tailwind CSS v4 token layer plus shadcn/ui-style components.

## Core philosophy

- Dark-first. Surfaces are near-black indigo; the primary is an energetic indigo with a soft glow. Never use light/cream backgrounds for app chrome.
- Calm and technical: generous spacing, subtle borders (`border-white/10` style), gentle lift-and-glow hovers. No loud gradients on body content.
- Plain-language, operator-friendly UI. Help text is a feature — keep hints concise and human.

## Hard constraints

- Use design tokens (CSS custom properties / Tailwind theme tokens) for every color, radius, shadow, and font. Never hardcode hex values outside the token definitions.
- Headings: Syne. Body: Plus Jakarta Sans. Code/data: JetBrains Mono. Never introduce another font.
- Interactive elements are semantic (`<button>`, `<a>`, `<label htmlFor>`), keyboard-reachable, with a visible focus ring.
- Components expose variation via `variant` / `size` props with fixed option sets — no ad-hoc boolean style props.

## Consumer setup (required)

1. Import the theme once: `import "@/design-system/scrapefix/styles.css"` (adjust the path to where the library was attached). This file defines every token, the `@theme` mapping, and the animation utilities.
2. Load the brand fonts with `<link>` tags in your root route's `<head>` — the tokens reference these families but cannot load them:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Syne:wght@400..800&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&family=JetBrains+Mono:wght@400..700&display=swap"
  rel="stylesheet"
/>
```

Without these links, text falls back to system fonts and the look breaks.

3. Use the `cn()` helper from the library for conditional class merging.

## Reference

See `.lovable/rules/design-tokens.md` for the full token tables and `.lovable/rules/components.md` for the component index.
