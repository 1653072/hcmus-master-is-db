/**
 * White Commerce Design System — Token Reference
 *
 * These tokens mirror the CSS custom properties in globals.css and
 * the Tailwind theme extensions.  Import when inline styles are
 * needed (e.g. dynamic backgrounds in charting libraries).
 */

export const designTokens = {
  colors: {
    whiteCanvas: 'var(--color-warm-canvas)',
    warmCanvas: 'var(--color-warm-canvas)',
    stoneSurface: 'var(--color-stone-surface)',
    parchmentCard: 'var(--color-parchment-card)',
    graphite: 'var(--color-graphite)',
    charcoalPrimary: 'var(--color-charcoal-primary)',
    midnight: 'var(--color-midnight)',
    obsidian: 'var(--color-midnight)',
    ash: 'var(--color-ash)',
    fog: 'var(--color-fog)',
    smoke: 'var(--color-smoke)',
    pepper: 'var(--color-pepper)',
    emberOrange: 'var(--color-ember-orange)',
    meadowGreen: 'var(--color-meadow-green)',
    skyBlue: 'var(--color-sky-blue)',
    sunburstYellow: 'var(--color-sunburst-yellow)',
    deepAmber: 'var(--color-deep-amber)',
    oceanBlue: 'var(--color-ocean-blue)',
    iceBlue: 'var(--color-ice-blue)',
    spearmint: 'var(--color-spearmint)',
    flamingo: 'var(--color-flamingo)',
    violetPop: 'var(--color-violet-pop)',
    coralRed: 'var(--color-coral-red)',
    validGreen: 'var(--color-valid-green)',
    background: 'var(--surface-canvas)',
    surface: 'var(--surface-card)',
    surfaceAlt: 'var(--surface-recessed-panel)',
    surfaceSoft: 'var(--surface-stone-tint)',
    text: 'var(--color-graphite)',
    textMuted: 'var(--color-ash)',
    textSoft: 'var(--color-smoke)',
    border: 'var(--color-stone-surface)',
    accent: 'var(--color-ember-orange)',
    accentDark: 'var(--color-ember-orange)',
    ctaDarkBg: 'var(--color-midnight)',
    ctaDarkText: 'var(--surface-card)',
    ctaLightBg: 'var(--color-cta-light-bg)',
    ctaLightText: 'var(--color-midnight)',
  },
  radius: {
    tags: 'var(--radius-tags)',
    cards: 'var(--radius-cards)',
    icons: 'var(--radius-icons)',
    inputs: 'var(--radius-inputs)',
    buttons: 'var(--radius-buttons)',
    cardsLarge: 'var(--radius-cards-large)',
    buttonsPill: 'var(--radius-buttons-pill)',
    illustrations: 'var(--radius-illustrations)',
  },
  spacing: {
    sectionY: 'var(--section-y)',
    sectionYLarge: 'var(--section-y-lg)',
    productGridGap: 'var(--product-grid-gap)',
    panelPad: 'var(--panel-padding)',
    cardPad: 'var(--card-padding)',
  },
  typography: {
    display: "var(--font-sans)",
    body: "var(--font-sans)",
  },
  shadows: {
    subtle: 'var(--shadow-subtle)',
    cardHover: 'var(--shadow-sm)',
    lg: 'var(--shadow-lg)',
    float: 'var(--shadow-float)',
    nav: 'var(--shadow-subtle-3)',
  },
  layout: {
    pageMaxWidth: 'var(--page-max-width)',
    sectionGap: 'var(--section-gap)',
  },
} as const;
