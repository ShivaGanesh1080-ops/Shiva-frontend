/** @type {import('postcss-load-config').Config} */
export default {
  plugins: {
    "@tailwindcss/postcss": {}, // 🔥 This is the fix!
    autoprefixer: {},
  },
};