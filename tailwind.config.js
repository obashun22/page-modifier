/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // クラスベースのダークモード切り替え
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'github-blue': {
          DEFAULT: '#0969da',
          50: '#ddf4ff',
          100: '#b6e3ff',
          200: '#80ccff',
          300: '#54aeff',
          400: '#218bff',
          500: '#0969da',
          600: '#0550ae',
          700: '#033d8b',
          800: '#0a3069',
          900: '#002155',
        },
        'github-gray': {
          50: '#fafbfc',   // カード背景（より明るく）
          100: '#f6f8fa',  // バッジ背景（より明るく）
          200: '#e5e7eb',  // 未使用（予備）
          300: '#d0d7de',  // ボーダー
          400: '#888888',  // テキスト（ID/Domain）
          500: '#6e7781',  // テキスト（コード）
          600: '#666666',  // テキスト（説明文）
          700: '#24292f',  // ダークテキスト
          800: '#1f2937',  // ダーク背景（予備）
          900: '#111827',  // ダーク背景（予備）
        },
      },
    },
  },
  plugins: [],
}
