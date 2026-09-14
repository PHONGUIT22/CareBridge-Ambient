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
        ambient: {
          root: '#070D14',       // Nền tổng thể sâu thẳm
          surface: '#0B131B',    // Mặt phẳng cấp 1 (Header, Nav, Modal)
          card: '#131F2C',       // Bề mặt thẻ thuốc squircle
          hover: '#1A2A3C',      // Trạng thái hover
          border: 'rgba(255, 255, 255, 0.08)',
        },
        alexa: {
          cyan: '#00CAFF',       // Xanh Cyan đặc trưng của Amazon Alexa
          cyanGlow: 'rgba(0, 202, 255, 0.45)',
          blue: '#0070BA',
          deep: '#030811',
        },
        neon: {
          emerald: '#10B981',    // Xanh ngọc bảo báo liều đã uống
          emeraldGlow: 'rgba(16, 185, 129, 0.45)',
          amber: '#F59E0B',      // Cảnh báo cữ sắp tới
          rose: '#F43F5E',       // Nhịp tim / Huyết áp
        },
      },
      boxShadow: {
        'glow-cyan': '0 0 25px rgba(0, 202, 255, 0.45)',
        'glow-cyan-lg': '0 0 45px rgba(0, 202, 255, 0.7)',
        'glow-emerald': '0 0 25px rgba(16, 185, 129, 0.45)',
        'ambient-card': '0 10px 30px -5px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
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