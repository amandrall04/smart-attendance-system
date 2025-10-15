module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx,html}',
    './public/index.html'
  ],
  theme: {
    extend: {
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        btnGlow: {
          '0%': { boxShadow: '0 0 0px rgba(0,0,0,0)' },
          '50%': { boxShadow: '0 10px 30px rgba(0,0,0,0.08)' },
          '100%': { boxShadow: '0 0 0px rgba(0,0,0,0)' },
        }
      },
      animation: {
        'fade-up': 'fadeUp 420ms ease-out both',
        'btn-glow-slow': 'btnGlow 1400ms ease-in-out both'
      }
    },
  },
  plugins: [],
}
