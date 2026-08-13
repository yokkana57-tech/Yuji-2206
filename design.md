# InstantSite — Design System

## Concept
An internal tool for a solo sales operator: manage leads, send an SMS with a personalized onboarding link, and instantly generate a live small-business website (restaurant or general local business) from just a name + location. Generated sites must look credible and versatile enough for both a restaurant and a generic company — neutral, structure-first, not food-photo-dependent.

## Typography
- Display/headings: **Poppins** (600/700)
- Body: **Poppins** (400/500)
- Large, confident hero type; generous line-height on body copy.

## Color System
Warm neutral base with a single amber accent — works for food warmth and professional trust alike.

```css
--bg: #0f0d0b;          /* admin dashboard dark base */
--surface: #17140f;
--surface-2: #221d16;
--border: #322a1f;
--ink: #f5f1e8;         /* light text on dark */
--ink-dim: #b8ae9c;

--site-bg: #faf7f0;     /* generated public sites: warm paper */
--site-ink: #1c1a16;
--site-ink-dim: #635c4d;
--site-surface: #ffffff;
--site-border: #e8e1d2;

--accent: #d97f2e;      /* amber/terracotta */
--accent-ink: #2a1a08;
--success: #6fae6a;
--danger: #d9614f;
```

## Layout
- Admin dashboard: dark, dense, data-forward (table/list based), sidebar-less single column with top bar.
- Onboarding form (customer-facing): light, centered single card, minimal friction, 3 fields max.
- Generated site: light "paper" theme, asymmetric hero (large type + offset image block), section rhythm: Hero → About → Offerings (menu/services) → Highlights → Location/Contact → Footer. Generous whitespace, no rounded-corner card grids — use dividers and overlapping blocks instead.

## Motion
- Staggered fade/slide-up on hero load (Motion library).
- Subtle hover lift on list rows and buttons only.

## Components
- Buttons: solid amber (primary), outline (secondary), pill-shaped, uppercase small-tracking label for CTAs on generated sites.
- Status pill: pending (gray), sent (amber outline), completed (green).
- Cards: no heavy shadows — 1px border + subtle background shift.

## Anti-patterns to avoid
- Purple gradients, generic rounded card grids, Inter/Space Grotesk/Roboto fonts, stock "corporate" clipart look.
