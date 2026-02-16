import type { Config } from "tailwindcss";

const config: Config = {
	darkMode: "class",
	content: [
		"./src/**/*.{html,js,svelte,ts}",
	],
	theme: {
		extend: {
			colors: {
				// Primary dark background
				'bg-primary': '#0f172a',
				'bg-secondary': '#1e293b',
				'bg-tertiary': '#334155',
				'bg-card': '#1e293b',
				// Text colors
				'text-primary': '#f1f5f9',
				'text-secondary': '#94a3b8',
				'text-muted': '#64748b',
				// Accent colors
				'accent': '#38bdf8',
				'accent-hover': '#0ea5e9',
				// Status colors
				'success': '#22c55e',
				'warning': '#f59e0b',
				'danger': '#ef4444',
				// Border
				'border': '#475569',
			},
			fontFamily: {
				sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
				mono: ['Courier New', 'monospace'],
			},
			spacing: {
				'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
				'safe-top': 'env(safe-area-inset-top, 0px)',
			},
			minHeight: {
				'touch': '44px',
			},
			animation: {
				'slide-up': 'slideUp 0.3s ease',
				'fade-in': 'fadeIn 0.2s ease',
			},
			keyframes: {
				slideUp: {
					from: { transform: 'translateY(100%)' },
					to: { transform: 'translateY(0)' },
				},
				fadeIn: {
					from: { opacity: '0' },
					to: { opacity: '1' },
				},
			},
		},
	},
	plugins: [],
};

export default config;
