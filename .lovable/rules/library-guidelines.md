# Scrapper — Guidelines

## Components

The design system exports these components — import them from `@ws-dd22e65cc6700b88943b/d1cd72ac-da03-4ec2-b353-7361702efa93` and compose them before building anything from scratch:

`AppShell`, `Button`, `Card`, `Constants`, `Hint`, `InfoModeProvider`, `InfoPanel`, `Input`, `Label`, `Logo`, `PageHeader`, `SheetExportCard`, `StatusBadge`, `Switch`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger`, `Tooltip`

Per-component details (import stanzas, props, variants, examples) live in `.lovable/rules/libraries/{slug}/components.md` — on disk, not auto-loaded. Read that file or the component source when the name alone isn't enough.

## Theme Files

The design system's theme is delivered through the following files. The author's original source files carry the full wiring the design system needs — variable declarations, framework-specific directives, provider objects, etc. — and are the canonical import target.

- `@ws-dd22e65cc6700b88943b/d1cd72ac-da03-4ec2-b353-7361702efa93/styles.css` (source — preferred import)
- `@ws-dd22e65cc6700b88943b/d1cd72ac-da03-4ec2-b353-7361702efa93/dist/tokens.css` (auto-generated flat list of CSS custom properties — a raw-values fallback only; does NOT carry framework-specific wiring that the source files above provide)

