module.exports = {
  content: [
    './**/*.html',
    './**/*.ejs',
    './public/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',    // Blue
        secondary: '#1F2937',  // Dark grey
        background: '#FFFFFF', // White
        text: '#111827',       // Near black
        accent: '#6B7280',     // Medium grey
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '4': '16px',
        '6': '24px',
      },
    },
  },
  plugins: [],
}
