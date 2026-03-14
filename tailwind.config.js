/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './*.js'],
  theme: {
    extend: {
      maxWidth: {
        'prose': '1100px',
      },
    },
  },
  plugins: [],
};
