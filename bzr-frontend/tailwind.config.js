const brandGreen = {
  50: '#e6f6ed',
  100: '#c4ebd7',
  200: '#99ddb9',
  300: '#6dcf9c',
  400: '#4dc487',
  500: '#36b86d',
  600: '#2ea45f',
  700: '#258451',
  800: '#1d6841',
  900: '#144f32',
  950: '#0c3320',
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        blue: brandGreen,
      },
    },
  },
  plugins: [],
  // Explicitly set purge to prevent warnings
  purge: {
    enabled: process.env.NODE_ENV === 'production',
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
  },
};
