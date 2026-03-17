import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: ['src/app/**/page.tsx', 'src/app/**/layout.tsx'],
  project: ['src/**/*.{ts,tsx}'],
  ignore: ['src/**/__tests__/**', 'src/**/*.test.*'],
  ignoreDependencies: [
    // Add packages that knip flags incorrectly here
  ],
};

export default config;
