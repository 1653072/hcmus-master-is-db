# Bookstore Frontend Implementation Plan

## Goal
Build the storefront page-by-page following the current design system, starting with the homepage and then rolling out the remaining public, conversion, account, and admin screens.

## Route map from homepage

### Header
- Logo → `/`
- Books → `/books`
- Categories → `/categories`
- Best sellers → `/best-sellers`
- Authors → `/authors`
- Blog → `/blog`
- Search → `/books?query=` or `/search`
- Sign in → `/login`

### Hero
- Primary CTA → `/books`
- Secondary CTA → `/categories`

### Recommended / Recently Added / Best seller / Popular items
- View all → relevant list page
- Book card → `/books/[id]`
- Category pill → `/categories/[slug]`

### Footer
- Books → `/books`
- Categories → `/categories`
- Best sellers → `/best-sellers`
- Popular this month → `/most-viewed/30days`

## Build order

### Phase 1 — Public catalog
1. `/books`
2. `/books/[id]`
3. `/categories`
4. `/categories/[slug]`
5. `/best-sellers`
6. `/most-viewed/daily`
7. `/most-viewed/30days`

### Phase 2 — Conversion flow
8. `/cart`
9. `/checkout`
10. `/order-success`
11. `/order-failed`

### Phase 3 — Auth and account
12. `/login`
13. `/register`
14. `/forgot-password`
15. `/profile`
16. `/orders`
17. `/orders/[id]`
18. `/addresses`

### Phase 4 — Admin
19. `/admin`
20. `/admin/books`
21. `/admin/books/[id]`
22. `/admin/categories`
23. `/admin/orders`
24. `/admin/orders/[id]`
25. `/admin/users`
26. `/admin/analytics`

## Design system rules to keep consistent
- Use the ivory / cream background family from the homepage
- Use serif display styling for large headings and sans-serif for body/UI text
- Keep rounded corners soft and consistent
- Use the same border and shadow language across cards and panels
- Prefer section spacing based on the current homepage rhythm
- Reuse `Header`, `Footer`, `BookCard`, `SectionHeader`, and all `home/*` sections where possible

## Page implementation checklist
For every new page:
1. Define route structure and destination links
2. Reuse existing layout and card primitives
3. Add page-specific components only if needed
4. Ensure responsive behavior
5. Run lint/build check
6. Update this plan if route mapping changes

## Current next task
- Implement `/books` page
- Then implement `/books/[id]`
