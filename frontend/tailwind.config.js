export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          background: "#EBF6FB",
          light: "#8CA5AF",
          DEFAULT: "#34464D",
          dark: "#1E2B32",
        },
        success: {
          background: "#E3FAD9",
          light: "#96e28c",
          DEFAULT: "#3FA244",
          dark: "#247535",
        },
        info: {
          light: "#6de1f0",
          DEFAULT: "#299FD1",
        },
        warning: {
          lightest: "#FEF1CB",
          light: "#fac664",
          DEFAULT: "#ef8801",
          dark: "#AC5200",
        },
        error: {
          background: "#FADED1",
          light: "#ec8574",
          DEFAULT: "#c81a23",
        },
        neutral: {
          link: "#485466",
          background: "#F2F4F7",
          light: "#d0d5dd",
          gray: "#808991",
          DEFAULT: "#677084",
        },
        disabled: {
          DEFAULT: "rgba(208, 213, 221, 1)",
        },
        base: {
          white: "#fff",
          black: "#111",
        },
      },
      fontFamily: {
        "plus-jakarta-sans": ["Plus Jakarta Sans", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "16px",
      },
      boxShadow: {
        custom: "0px 640px 179px 0px rgba(0, 0, 0, 0.00), 0px 410px 164px 0px rgba(0, 0, 0, 0.01), 0px 230px 138px 0px rgba(0, 0, 0, 0.05), 0px 102px 102px 0px rgba(0, 0, 0, 0.09), 0px 26px 56px 0px rgba(0, 0, 0, 0.10)",
      }
    },
    // Set the default font family for the entire application with fallbacks
    fontFamily: {
      sans: ["Plus Jakarta Sans", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      serif: ["Plus Jakarta Sans", "Georgia", "Cambria", "Times New Roman", "Times", "serif"],
      mono: ["Plus Jakarta Sans", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"],
      display: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
      body: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
    },
  },
  variants: {},
  plugins: [],
};