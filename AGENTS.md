# Project Rules

## Figma MCP Integration Rules

These rules define how to translate Figma inputs into this project. Follow them for every Figma-driven UI change.

### Required Flow

1. Run `get_design_context` for the exact Figma node before implementation.
2. If the response is too large or truncated, run `get_metadata`, identify the required nodes, then re-fetch only those nodes with `get_design_context`.
3. Run `get_screenshot` for the same node or variant before writing code.
4. Use Figma localhost asset sources directly when provided. Do not recreate those assets as placeholders.
5. Treat generated React/Tailwind from Figma as design reference, not final project code.
6. Implement using this repository's components, tokens, route structure, and data-fetching patterns.
7. Validate the local UI against the Figma screenshot before marking complete.

### Frontend Stack

- Framework: Next.js App Router with React and TypeScript.
- Styling: Tailwind CSS v3 plus CSS variables in `frontend/src/app/globals.css`.
- Path alias: use `@/` for frontend imports from `frontend/src`.
- State: Zustand stores live in `frontend/src/stores`.
- API clients and shared types live in `frontend/src/lib`.

### Component Organization

- IMPORTANT: Reuse `frontend/src/components/ui/button.tsx` for buttons.
- IMPORTANT: Reuse `frontend/src/components/ui/commerce.tsx` for customer-facing sections, panels, grids, skeletons, and empty/error states.
- IMPORTANT: Reuse `frontend/src/components/books/book-card.tsx` for all bookstore product cards.
- Layout components live in `frontend/src/components/layout`.
- Feature components live in `frontend/src/components/<feature>`.
- Route-level screens live in `frontend/src/app`.
- New React components use PascalCase exports. File names in this codebase may be kebab-case for shared UI and PascalCase for feature components; follow the local directory pattern.

### Design Tokens

- IMPORTANT: Never hardcode hex colors in components. Use Tailwind token names backed by CSS variables in `frontend/src/app/globals.css`.
- IMPORTANT: Use white for primary backgrounds through `bg-canvas` or `bg-white`; never use `#000000` for text. Use `text-charcoal`, `text-graphite`, or `text-ash`.
- Palette strategy is restrained marketplace: warm tinted neutrals plus one commerce accent.
- Primary action and active state color is `ember`.
- Error/destructive state is `coral-red`; success is `meadow`; deal emphasis is `sunburst`.
- Radius tokens are defined in `frontend/src/app/globals.css` and exposed through Tailwind as `rounded-buttons`, `rounded-cards`, `rounded-cards-lg`, and related names.
- Shadows use `shadow-subtle`, `shadow-card-hover`, or `shadow-card-lg`; avoid custom decorative shadows unless a Figma design requires a measured equivalent.

### Marketplace UI Rules

- Customer-facing UI uses Vietnamese with accents and VND prices.
- Header must remain fixed, solid, and readable. Do not use glassmorphism or backdrop blur for the main header.
- Product grids should use `ProductGrid` unless a design explicitly requires a different commerce pattern.
- Product cards should show only real data or safe optional fallbacks. Do not invent review counts, discounts, stock, or vouchers from nowhere.
- Use `font-medium` and `font-semibold` by default. Reserve `font-bold` for compact badges or the small brand mark.
- Do not create nested cards. Use sections, panels, and product cards as separate layers.
- Avoid generic repeated icon-heading-text card grids.

### Asset Handling

- Figma MCP localhost image and SVG sources should be used directly when returned.
- Store downloaded static assets in `frontend/public/assets` if persistence is needed.
- Do not add new icon packages. The project already uses `lucide-react`.
- Do not create placeholder assets when Figma provides real assets.

### Accessibility And Verification

- All interactive controls need visible focus states.
- Forms require visible labels and inline field errors.
- Loading states should use skeletons for content areas, not centered spinners.
- Run `npm run lint` and `npm run build` in `frontend` after UI changes.
