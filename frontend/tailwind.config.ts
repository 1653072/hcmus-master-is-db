import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        white: 'var(--surface-card)',
        black: 'var(--surface-dark-shell)',
        canvas: 'var(--surface-canvas)',
        'stone-surface': 'var(--surface-stone-tint)',
        parchment: 'var(--surface-recessed-panel)',
        graphite: 'var(--color-graphite)',
        charcoal: 'var(--color-charcoal-primary)',
        midnight: 'var(--color-midnight)',
        ash: 'var(--color-ash)',
        fog: 'var(--color-fog)',
        smoke: 'var(--color-smoke)',
        pepper: 'var(--color-pepper)',
        ember: 'var(--color-ember-orange)',
        meadow: 'var(--color-meadow-green)',
        'sky-accent': 'var(--color-sky-blue)',
        sunburst: 'var(--color-sunburst-yellow)',
        'deep-amber': 'var(--color-deep-amber)',
        ocean: 'var(--color-ocean-blue)',
        'ice-blue': 'var(--color-ice-blue)',
        spearmint: 'var(--color-spearmint)',
        flamingo: 'var(--color-flamingo)',
        'violet-pop': 'var(--color-violet-pop)',
        'coral-red': 'var(--color-coral-red)',
        'valid-green': 'var(--color-valid-green)',
      },
      fontFamily: {
        display: ['var(--font-sans)'],
        inter: ['var(--font-sans)'],
        sans: ['var(--font-sans)'],
      },
      borderRadius: {
        tags: 'var(--radius-tags)',
        cards: 'var(--radius-cards)',
        icons: 'var(--radius-icons)',
        inputs: 'var(--radius-inputs)',
        buttons: 'var(--radius-buttons)',
        'cards-lg': 'var(--radius-cards-large)',
        pill: 'var(--radius-buttons-pill)',
        illustrations: 'var(--radius-illustrations)',
      },
      boxShadow: {
        subtle: 'var(--shadow-subtle)',
        'subtle-3': 'var(--shadow-subtle-3)',
        'card-lg': 'var(--shadow-lg)',
        'card-hover': 'var(--shadow-sm)',
      },
      maxWidth: {
        page: 'var(--page-max-width)',
      },
      spacing: {
        '4.5': '18px',
        '15': '60px',
        '19': '76px',
        '23': '92px',
        '26': '104px',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.19, 1, 0.22, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
