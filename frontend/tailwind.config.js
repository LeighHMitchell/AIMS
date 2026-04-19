/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['selector', '.__dark-mode-disabled__'],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	fontFamily: {
  		mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
  	},
  	extend: {
  		// Semantic typography scale (additive — does NOT override default text-xs/sm/base/...).
  		// Components opt in by switching their class (e.g. text-sm → text-helper, text-2xl → text-card-title).
  		// No visual change until components migrate. See typography review for migration order.
  		fontSize: {
  			// Body & supporting text
  			'caption':       ['0.75rem',  { lineHeight: '1.4' }],   // 12px — badges, timestamps, code chips
  			'helper':        ['0.875rem', { lineHeight: '1.5' }],   // 14px — field helper text, table cell metadata
  			'body':          ['1rem',     { lineHeight: '1.55' }],  // 16px — DEFAULT body, descriptions, labels
  			'body-lg':       ['1.125rem', { lineHeight: '1.5' }],   // 18px — emphasized body, lead paragraphs
  			// Eyebrow / uppercase labels (letter-spacing baked in)
  			'section-label': ['0.75rem',  { lineHeight: '1.3', letterSpacing: '0.05em' }], // 12px UPPERCASE
  			// Headings
  			'card-title':    ['1.25rem',  { lineHeight: '1.3' }],   // 20px — card headings, modal titles
  			'section-title': ['1.5rem',   { lineHeight: '1.2' }],   // 24px — tab section headings (SectionHeader target)
  			'page-title':    ['1.875rem', { lineHeight: '1.15' }],  // 30px — top-of-activity title
  		},
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			calendar: {
  				'primary-scarlet': '#dc2625',
  				'pale-slate': '#cfd0d5',
  				'blue-slate': '#4c5568',
  				'cool-steel': '#7b95a7',
  				'platinum': '#f1f4f8'
  			},
  			brand: {
  				scarlet: 'hsl(var(--brand-scarlet))',
  				'pale-slate': 'hsl(var(--brand-pale-slate))',
  				'blue-slate': 'hsl(var(--brand-blue-slate))',
  				'cool-steel': 'hsl(var(--brand-cool-steel))',
  				platinum: 'hsl(var(--brand-platinum))',
  			},
  			'surface-muted': 'var(--surface-muted)',
			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: '0.375rem',
  			sm: '0.25rem'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: 0
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: 0
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} 