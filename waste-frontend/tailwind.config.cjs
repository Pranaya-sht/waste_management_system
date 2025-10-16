/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",                  // Scans your main HTML file for Tailwind classes
        "./src/**/*.{js,jsx,ts,tsx}",    // Scans all JS/TS/JSX/TSX files in src/
    ],
    theme: {
        extend: {},                       // You can add custom colors, fonts, spacing here
    },
    plugins: [],                         // Add Tailwind plugins here if needed
}
