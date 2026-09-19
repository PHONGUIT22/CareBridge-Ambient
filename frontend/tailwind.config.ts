import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/screens/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],    // Default body font
        display: ['var(--font-geist)', 'sans-serif'], // Headings & badges
        geist: ['var(--font-geist)', 'sans-serif'],
        inter: ['var(--font-inter)', 'sans-serif'],
      },
      colors: {
        smart: {
          bg: '#181B2A',         // Deep Midnight Navy background
          deep: '#121420',       // Darkest navy vignette
          card: '#22273B',       // Rounded dark slate card surface
          hover: '#2A3048',      // Card hover state
          muted: '#8A92A6',      // Secondary/Muted typography
          border: 'rgba(255, 255, 255, 0.06)',
        },
        coral: {
          DEFAULT: '#FF725E',    // Primary Warm Accent
          light: '#FF8A71',      // Lighter peach gradient stop
          glow: 'rgba(255, 114, 94, 0.25)',
        },
        softBlue: {
          DEFAULT: '#4D8BFF',    // Secondary Cool Accent
          light: '#38BDF8',      // Sky blue
          glow: 'rgba(77, 139, 255, 0.25)',
        },
        ambient: {
          root: '#121420',       // Nền tổng thể sâu thẳm
          surface: '#181B2A',    // Mặt phẳng cấp 1 (Header, Nav, Modal)
          card: '#22273B',       // Bề mặt thẻ thuốc squircle
          hover: '#2A3048',      // Trạng thái hover
          border: 'rgba(255, 255, 255, 0.06)',
        },
        alexa: {
          cyan: '#FF725E',       // Primary accent mapped to warm coral
          cyanGlow: 'rgba(255, 114, 94, 0.35)',
          blue: '#4D8BFF',       // Cool soft blue
          deep: '#121420',
        },
        neon: {
          emerald: '#10B981',    // Xanh ngọc bảo báo liều đã uống
          emeraldGlow: 'rgba(16, 185, 129, 0.45)',
          amber: '#F59E0B',      // Cảnh báo cữ sắp tới
          rose: '#F43F5E',       // Nhịp tim / Huyết áp
        },
      },
      boxShadow: {
        'glow-coral': '0 0 20px rgba(255, 114, 94, 0.25)',
        'glow-coral-lg': '0 0 35px rgba(255, 114, 94, 0.45)',
        'glow-softblue': '0 0 20px rgba(77, 139, 255, 0.25)',
        'smart-card': '0 10px 25px rgba(0, 0, 0, 0.3)',
        'glow-cyan': '0 0 20px rgba(255, 114, 94, 0.35)',
        'glow-cyan-lg': '0 0 35px rgba(255, 114, 94, 0.55)',
        'glow-emerald': '0 0 25px rgba(16, 185, 129, 0.45)',
        'ambient-card': '0 10px 25px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'neumorph-inner': 'inset 2px 2px 5px rgba(0, 0, 0, 0.6), inset -2px -2px 5px rgba(255, 255, 255, 0.03)',
      },
      animation: {
        'orb-breath': 'orbBreath 3s infinite ease-in-out',
        'ring-pulse': 'ringPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        orbBreath: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 25px rgba(0, 202, 255, 0.5)' },
          '50%': { transform: 'scale(1.06)', boxShadow: '0 0 45px rgba(0, 202, 255, 0.85)' },
        },
        ringPulse: {
          '0%': { opacity: '0.8', transform: 'scale(0.95)' },
          '50%': { opacity: '0.2', transform: 'scale(1.3)' },
          '100%': { opacity: '0.8', transform: 'scale(0.95)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;