/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vayra: {
          bg: '#F7FAFC',
          card: '#FFFFFF',
          panel: '#FFFFFF',
          border: '#DCE8F5',
          blue: '#0B5ED7',
          electric: '#2563EB',
          cyan: '#06B6D4',
          teal: '#14B8A6',
          navy: '#10233F',
          muted: '#607089',
          lightBlue: '#EEF6FF',
          skyBg: 'rgba(238, 246, 255, 0.7)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      backgroundImage: {
        'light-hero-gradient': 'linear-gradient(180deg, #EEF6FF 0%, #FFFFFF 100%)',
        'blue-gradient': 'linear-gradient(135deg, #0B5ED7 0%, #2563EB 100%)',
        'soft-glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(247, 250, 252, 0.85) 100%)'
      },
      boxShadow: {
        'soft-glow': '0 10px 30px -5px rgba(11, 94, 215, 0.12), 0 4px 12px rgba(0, 0, 0, 0.04)',
        'blue-card': '0 15px 35px rgba(11, 94, 215, 0.1), 0 5px 15px rgba(0, 0, 0, 0.03)',
        'glass-hover': '0 20px 40px rgba(11, 94, 215, 0.15)'
      }
    },
  },
  plugins: [],
}
