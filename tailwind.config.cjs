/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Outfit', 'DM Sans', 'system-ui', 'sans-serif'],
                display: ['Outfit', 'sans-serif'],
                mono: ['Space Grotesk', 'Fira Code', 'monospace'],
            },
            colors: {
                // 现有颜色
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                // 新增：温暖活力配色
                primaryCustom: {
                    DEFAULT: '#FF6B6B',
                    50: '#FFF0F0',
                    100: '#FFE0E0',
                    200: '#FFBDBD',
                    300: '#FF9A9A',
                    400: '#FF7878',
                    500: '#FF6B6B',
                    600: '#FF5252',
                    700: '#E63946',
                },
                accentCustom: {
                    DEFAULT: '#4ECDC4',
                    50: '#E6FFFC',
                    100: '#B2F5F0',
                    200: '#7EEBE4',
                    300: '#4AE0D7',
                    400: '#4ECDC4',
                    500: '#3DBDB3',
                    600: '#30AFA3',
                    700: '#289691',
                },
                warm: {
                    DEFAULT: '#FFE66D',
                    100: '#FFF9C3',
                    200: '#FFF59D',
                    300: '#FFF08D',
                    400: '#FFE66D',
                    500: '#FFD93D',
                },
                dark: {
                    DEFAULT: '#2C3E50',
                    700: '#34495E',
                    800: '#2C3E50',
                    900: '#1A252F',
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
        },
    },
    plugins: [],
}
