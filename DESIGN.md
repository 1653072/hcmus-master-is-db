# Design

## Overview

The frontend currently leans toward a warm bookstore aesthetic with soft neutrals, large editorial typography, rounded surfaces, and simple orange accents. The homepage is composed as a content-first storefront rather than a dense dashboard, with a prominent hero, book recommendations, category pills, rankings, service highlights, and testimonials.

## Visual Direction

- Base canvas: light stone and zinc neutrals
- Accent color: warm orange for the primary action and selected emphasis
- Mood: approachable, calm, and inviting
- Overall feel: friendly retail catalog with a lightly editorial tone

## Typography

The homepage uses a display-led hierarchy:

- Large, expressive hero title for the main promise
- Smaller body text for supporting copy and product explanations
- Medium-weight buttons and labels for quick scanning

The current implementation suggests a mix of display and sans-serif styling, with generous size contrast to separate discovery from supporting content.

## Layout

- The homepage is organized as a vertical story with distinct content sections
- Sections are spaced generously to reduce crowding and support browsing
- The hero uses a two-column composition: copy on the left, product imagery on the right
- Secondary sections use compact grids, pill navigation, and list-like ranking blocks

## Components Observed

- `Header`
- `HeroSection`
- `AuthorStrip`
- `BooksGridSection`
- `CategoryPills`
- `RankingSection`
- `TrendingSection`
- `ServicesSection`
- `TestimonialsSection`
- `Footer`
- `BookCard`

## Interaction Patterns

- The homepage loads books asynchronously from the API
- Loading and error states are shown as lightweight inline states
- Primary navigation is likely handled through header links and section-level calls to action
- Product cards appear to be the main interactive unit for browsing and purchase entry

## Strengths

- Clear, approachable retail framing
- Strong hierarchy on the hero section
- Content is broken into understandable browsing zones
- The warm palette fits the bookstore domain well

## Design Gaps

- The current pages may feel visually template-like if spacing, typography, and card treatment are not pushed further
- Some copy in sections appears placeholder-like or inconsistent in wording
- The design system is not yet explicitly documented in code, so colors, typography, and spacing may be spread across components

## Guidance For Future UI Work

- Keep the bookstore feeling warm and human, not corporate
- Prefer editorial hierarchy over dense information blocks
- Use orange as a deliberate action color, not as a general decorative tint
- Keep browsing surfaces calm and highly legible
- Maintain strong spacing rhythm between sections and inside cards
- Make loading, empty, and error states feel intentional rather than technical
