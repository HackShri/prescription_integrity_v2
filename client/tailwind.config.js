/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f4f8ff',
          100: '#e7f1ff',
          200: '#cee3ff',
          300: '#adcff9',
          400: '#86b6f0',
          500: '#5d99e2',
          600: '#3c82d6',
          700: '#2f6ab0',
          800: '#27558a',
          900: '#1c3b5c',
        },
        teal: {
          50: '#edfdf9',
          100: '#d3f7ee',
          200: '#a6ecdd',
          300: '#78dfcc',
          400: '#4fd2bb',
          500: '#36b9a2',
          600: '#2b9583',
          700: '#23786b',
          800: '#1f5d54',
          900: '#18413b',
        },
        slate: {
          50: '#f6f8fb',
          100: '#eaeff5',
          200: '#d6dde6',
          300: '#bcc6d1',
          400: '#95a3b3',
          500: '#73879a',
          600: '#5c6c80',
          700: '#4a5668',
          800: '#394252',
          900: '#27303a',
        },
        primary: {
          DEFAULT: '#3c82d6',
          foreground: '#ffffff',
          hover: '#2f6ab0',
          muted: '#e7f1ff',
        },
        secondary: {
          DEFAULT: '#36b9a2',
          foreground: '#ffffff',
          hover: '#2b9583',
        },
        accent: {
          DEFAULT: '#4c7cd6',
          foreground: '#ffffff',
          hover: '#3b64b0',
        },
        background: '#f5f9ff',
        foreground: '#1f2a37',
        card: {
          DEFAULT: '#ffffff',
          foreground: '#1f2a37',
        },
        popover: {
          DEFAULT: '#ffffff',
          foreground: '#1f2a37',
        },
        muted: {
          DEFAULT: '#eef3fb',
          foreground: '#5f6b7f',
        },
        border: '#d6e4f5',
        input: '#d6e4f5',
        ring: '#8ab9f2',
        destructive: {
          DEFAULT: '#f0625d',
          foreground: '#ffffff',
        },
        success: {
          DEFAULT: '#2f9f85',
          foreground: '#ffffff',
        },
        warning: {
          DEFAULT: '#f4a63a',
          foreground: '#ffffff',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      animation: {
        'fade-in': 'fadeIn 0.8s ease-out',
        'slide-in-left': 'slideInFromLeft 0.6s ease-out',
        'slide-in-right': 'slideInFromRight 0.6s ease-out',
        'slide-in-top': 'slideInFromTop 0.6s ease-out',
        'slide-in-bottom': 'slideInFromBottom 0.6s ease-out',
        'scale-in': 'scaleIn 0.5s ease-out',
        'bounce': 'bounce 1s infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin': 'spin 1s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInFromLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInFromRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInFromTop: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInFromBottom: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        bounce: {
          '0%, 100%': {
            transform: 'translateY(-25%)',
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
          },
          '50%': {
            transform: 'none',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
          },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};