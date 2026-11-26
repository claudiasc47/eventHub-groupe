import type { StorybookConfig } from '@storybook/react-vite'

// Adresse fictive : toutes les requêtes sont servies par les mocks MSW.
const STORYBOOK_API_URL = 'http://localhost:3000/api'

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.mdx', '../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  core: { disableTelemetry: true },
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    define: {
      ...viteConfig.define,
      'import.meta.env.VITE_API_URL': JSON.stringify(STORYBOOK_API_URL),
    },
  }),
}

export default config
