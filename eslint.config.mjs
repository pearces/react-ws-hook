import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import configPrettier from 'eslint-config-prettier/flat';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  configPrettier,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.{cjs,mjs}']
        },
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  tseslint.configs.stylisticTypeChecked,
  reactPlugin.configs.flat.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        globalThis: true,
        NodeJS: true
      }
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin
    },
    rules: {
      'comma-dangle': ['error', 'never'],
      'react/jsx-filename-extension': [1, { extensions: ['.ts', '.tsx', '.js', '.jsx'] }],
      'react/jsx-props-no-spreading': [1, { custom: 'ignore' }],
      'prettier/prettier': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      ...reactHooksPlugin.configs['recommended-latest'].rules,
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/consistent-type-exports': 'error'
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.ts', '.tsx', '.js', '.jsx']
        }
      },
      react: {
        version: 'detect'
      }
    }
  },
  defineConfig([globalIgnores(['src/coverage'])]),
  prettierRecommended,
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off'
    }
  }
);
