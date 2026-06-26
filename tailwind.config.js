/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // App surfaces (neutral / slate)
        app: '#F8FAFC',
        'surface-1': '#FFFFFF',
        'surface-2': '#F1F5F9',
        line: '#E2E8F0',
        'sidebar-bg': '#0F172A',
        'sidebar-hover': '#1E293B',
        // Text
        'ink-primary': '#0F172A',
        'ink-secondary': '#475569',
        'ink-muted': '#94A3B8',
        // Accent (brand blue)
        accent: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        // Status — text/border colors
        success: '#16A34A',
        'success-bg': '#DCFCE7',
        warning: '#D97706',
        'warning-bg': '#FEF3C7',
        danger: '#DC2626',
        'danger-bg': '#FEE2E2',
        info: '#0891B2',
        'info-bg': '#CFFAFE',
        violet: '#7C3AED',
        'violet-bg': '#EDE9FE',
        neutral: '#64748B',
        'neutral-bg': '#F1F5F9',
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(15,23,42,.06)',
        md: '0 4px 12px rgba(15,23,42,.08)',
        xl: '0 20px 40px rgba(15,23,42,.18)',
        focus: '0 0 0 3px rgba(59,130,246,.35)',
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
