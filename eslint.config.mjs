import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jestplugin from 'eslint-plugin-jest';
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
          allowDefaultProject: ['src/__tests__/*.ts', '*.{cjs,mjs}']
        },
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  tseslint.configs.stylisticTypeChecked,
  importPlugin.flatConfigs.recommended,
  reactPlugin.configs.flat.recommended,
  reactHooksPlugin.configs['recommended-latest'],
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...jestplugin.environments.globals.globals,
        globalThis: true,
        NodeJS: true
      }
    },
    plugins: {
      react: reactPlugin,
      jest: jestplugin
    },
    rules: {
      'comma-dangle': ['error', 'never'],
      'react/jsx-filename-extension': [1, { extensions: ['.ts', '.tsx', '.js', '.jsx'] }],
      'react/jsx-props-no-spreading': [1, { custom: 'ignore' }],
      'prettier/prettier': 'error',
      'import/extensions': [
        'error',
        'ignorePackages',
        {
          ts: 'never',
          tsx: 'never',
          js: 'never',
          jsx: 'never'
        }
      ],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'error'
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.ts', '.tsx', '.js', '.jsx']
        },
        webpack: {
          config: 'webpack.config.js'
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
