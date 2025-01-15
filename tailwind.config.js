// tailwind.config.js
module.exports = {
  darkMode: "class",
  content: ["./public/*.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          light: "#93C5FD",
          DEFAULT: "#3B82F6",
          dark: "#2563EB",
        },
        secondary: {
          light: "#FCA5A5",
          DEFAULT: "#EF4444",
          dark: "#DC2626",
        },
        neutral: {
          light: "#F3F4F6",
          DEFAULT: "#FFFFFF",
          dark: "#1F2937",
        },
      },
    },
  },
  plugins: [],
};
