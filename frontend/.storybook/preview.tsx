import type { Preview } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router'
import '../src/index.css'
import '../src/design.css'

const preview: Preview = {
  tags: ['autodocs'],
  globalTypes: {
    theme: {
      description: 'Thème de l’application',
      toolbar: {
        title: 'Thème',
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Clair' },
          { value: 'dark', title: 'Sombre' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  parameters: {
    layout: 'padded',
    controls: { expanded: true },
    a11y: { test: 'todo' },
    router: { initialEntries: ['/'] },
  },
  decorators: [
    (Story, { globals, parameters }) => {
      document.documentElement.dataset.theme = globals.theme === 'dark' ? 'dark' : 'light'
      document.documentElement.lang = 'fr'
      const router = parameters.router as { initialEntries: string[] }
      return (
        <MemoryRouter initialEntries={router.initialEntries}>
          <Story />
        </MemoryRouter>
      )
    },
  ],
}

export default preview
