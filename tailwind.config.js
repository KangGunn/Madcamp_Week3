/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        main: "#1E293B", // 기존 색상
        customGray: "#94A3B8", // 새로운 색상 추가
      },
    },
  },
  plugins: [],
};
