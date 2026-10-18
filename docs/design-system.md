# Design system

CurioMap's UI follows a small set of Apple-inspired principles: neutral surfaces, one
restrained accent, soft depth, and motion that responds instantly and can be interrupted.
Everything lives in [`frontend/app/globals.css`](../frontend/app/globals.css) and
[`frontend/components/ui/`](../frontend/components/ui/).

## Principles

1. **Respond on press.** Buttons and chips scale down on `:active`; feedback never waits for release.
2. **One accent.** Blue (`accent`) marks the primary action and links. Green (`signal`), red
   (`heat-hot`) and orange (`amber`) carry status only.
3. **Depth, not decoration.** Layered soft shadows and translucent materials. No glows,
   gradients on surfaces or neon borders.
4. **Restraint.** Generous spacing, large display type for page titles, small quiet secondary text.
5. **Motion is optional.** All animation is disabled for `prefers-reduced-motion`.

## Theming

Light and dark follow the system preference. `<html data-theme="light|dark">` overrides it; the
header toggle stores the choice in `localStorage` and an inline script in
[`layout.tsx`](../frontend/app/layout.tsx) applies it before first paint.

Any element can opt into a theme with `data-theme="dark"`. The curiosity map always does, so its
markers, popups and overlays keep one look in both themes.

## Tokens

Defined as CSS variables on `:root` and exposed to Tailwind through `@theme inline`, so
utilities such as `bg-stage-2`, `text-ink-muted` and `border-line` change with the theme.

| Group | Tokens | Use |
|---|---|---|
| Surfaces | `stage`, `stage-2`, `stage-3` | Page background, cards, grouped areas |
| Text | `ink-strong`, `ink`, `ink-muted`, `ink-faint` | Headings, body, secondary, tertiary |
| Lines and fills | `line`, `line-2`, `fill`, `fill-2` | Borders, subtle hover and control backgrounds |
| Material | `material` | Translucent bars and overlays (pair with `backdrop-blur-xl backdrop-saturate-150`) |
| Accent | `accent`, `accent-strong`, `accent-soft`, `accent-ink` | Primary actions and links |
| Status | `signal`, `heat-hot`, `amber` (each with `-soft`) | Success or live, danger, streaks and ratings |

Use tokens, never hex values or raw Tailwind palette colours, so both themes stay correct.
The heat ramp on the map (`HEAT_COLD`, `HEAT_WARM`, `HEAT_HOT` in
[`map-style.ts`](../frontend/components/discover/map-style.ts)) is the one deliberate exception,
tuned for the dark basemap.

## Typography

System font stack (`-apple-system`, SF Pro on Apple devices) with Inter as the fallback via
`next/font`. SF Pro is not redistributed.

- `.display`: page and section titles, bold with tight tracking (use `text-4xl` to `text-7xl`).
- Body is 17px; secondary text `text-sm`; nothing smaller than `text-xs` (12px).
- Prefer `font-medium` and `font-semibold`; avoid `font-bold` outside `.display`.

## Components

| Piece | Where | Notes |
|---|---|---|
| `Button` | `components/ui/Button.tsx` | `primary`, `ghost`, `danger`, `subtle`; pill shaped; `isLoading` |
| `.btn-primary`, `.btn-ghost`, `.chip`, `.field` | `globals.css` | For links styled as buttons and plain inputs |
| `.card`, `.card-hover`, `.glass` | `globals.css` | Standard surface; hover lifts and deepens the shadow |
| `Modal` | `components/ui/Modal.tsx` | Spring entrance, focus management, scroll lock, Escape to close |
| `SectionHeading`, `Reveal` | `components/ui/` | Section titles; scroll-in animation that respects reduced motion |
| `Badge`, `Progress`, `Stars`, `Skeleton`, `Feedback` | `components/ui/` | Small status and loading pieces |

## Motion

Use `motion/react` springs for entrances and gestures
(`{ type: "spring", stiffness: 420, damping: 34 }` is the house default). For CSS transitions use
`--ease-out-expo`. Keep press feedback under 120 ms. Do not animate layout properties on large lists.

## Accessibility checklist

- Every interactive element is reachable by keyboard and shows the global focus ring.
- Touch targets are at least 44 px (`min-h-11`).
- Text meets WCAG AA contrast in both themes; check both when adding a colour.
- Icon-only buttons need an `aria-label`.
- Do not rely on colour alone for status.
