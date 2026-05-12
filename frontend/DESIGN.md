# Design System

## Scene

Customers browse a Vietnamese online bookstore on phones during short breaks and on laptops at home. The interface should feel like a dependable marketplace: warm, quick to scan, promotion-aware, but never noisy enough to make book discovery feel cheap.

## Visual Direction

The product uses a restrained marketplace system: a clean white base, warm neutral dividers, one commerce accent, and small semantic colors only when they carry status. The storefront should feel approachable and useful, closer to a trusted bookstore counter than a loud flash-sale wall.

## Color

- Use OKLCH tokens from `src/app/globals.css`; do not hardcode hex colors in components.
- Primary canvas: `canvas` and `white` are clean white backgrounds. Use `parchment` and `stone-surface` only for subtle separation.
- Text: `charcoal` for primary copy, `graphite` for body, `ash` for secondary labels. Do not use `#000000` for text.
- Accent: `ember` for primary actions, active states, sale moments, and current navigation only.
- Semantic colors: `meadow` for success, `coral-red` for destructive/error, `sunburst` for deal/voucher emphasis, `sky-accent`/`ocean` only for informational states.
- Avoid purple/blue gradients, pure black text, glassmorphism, and decorative color blobs.

## Typography

- Use one sans family through `--font-sans`; headings, labels, and data should feel like one product.
- Body copy uses 15px with readable line height.
- Product UI should prefer `font-medium` and `font-semibold`; reserve `font-bold` for small badges or brand marks only.
- No negative letter spacing. Uppercase labels may use modest positive tracking.
- Keep long prose under 65-75ch.

## Layout

- Global page max width is `max-w-page`.
- Customer-facing content uses `CommerceSection`; repeated commerce blocks use `CommercePanel`.
- Product collections use `ProductGrid`: 2 columns mobile, 3 on medium, 4 on extra-large.
- Header is fixed, solid, and commerce-first: logo, category, search, account, cart, and trust/voucher strip.
- Do not nest cards. A page section can contain product cards or panels, but panels should not sit inside decorative cards.

## Components

- Reuse `src/components/ui/button.tsx` for all button behavior and variants.
- Reuse `src/components/ui/commerce.tsx` for sections, panels, product grids, skeletons, and empty/error states.
- Reuse `src/components/books/book-card.tsx` for all customer-facing book tiles.
- Components should accept `className` only when composition is useful.
- Every interactive element needs visible focus, hover, active, and disabled/loading behavior when applicable.

## Copy And Locale

- Customer-facing UI is Vietnamese with accents, VND prices, and clear commerce verbs.
- Admin/back-office UI may remain more operational, but must still share tokens, spacing, and component vocabulary.
- Avoid generic filler copy. Labels should help the user decide or act.

## Motion

- Use 150-250ms transitions for hover, reveal, and active feedback.
- Animate transform and opacity only.
- No decorative page-load choreography.

## Accessibility

- Target WCAG 2.2 AA.
- Keep labels visible above form fields.
- Inline validation belongs directly below the field.
- Do not rely on color alone for sale, stock, status, or errors.
