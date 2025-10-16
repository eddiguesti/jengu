import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tailwindcss from 'eslint-plugin-tailwindcss'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/*.config.js',
      '**/*.config.ts',
    ],
  },

  // Base JavaScript rules for all files
  js.configs.recommended,

  // Base TypeScript rules for all .ts/.tsx files
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Frontend-specific configuration (React + Tailwind)
  {
    files: ['frontend/**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      tailwindcss,
    },
    settings: {
      react: {
        version: 'detect',
      },
      tailwindcss: {
        // Optional: specify custom Tailwind config location
        // config: 'frontend/tailwind.config.js',
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'warn',
      'react/prop-types': 'off', // Using TypeScript for prop validation
      'react/display-name': 'off', // Allow anonymous components (common with forwardRef)
      'react/no-unescaped-entities': 'off', // Allow apostrophes and quotes in JSX text

      // Tailwind CSS linting rules (frontend only)
      'tailwindcss/classnames-order': 'warn',
      'tailwindcss/no-custom-classname': [
        'warn',
        {
          whitelist: [
            // Custom theme colors from tailwind.config.js
            'primary.*',
            'background.*',
            'card.*',
            'elevated.*',
            'border.*',
            'text.*',
            'muted.*',
            'success.*',
            'warning.*',
            'error.*',
          ],
        },
      ],
      'tailwindcss/no-contradicting-classname': 'error',
    },
  },

  // Backend-specific configuration (Node.js)
  {
    files: ['backend/**/*.ts'],
    rules: {
      // Node.js-specific rules can go here
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },

  // Disable rules that conflict with Prettier (must be last)
  prettier
)
