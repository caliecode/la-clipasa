import { render as testingLibraryRender } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { queryClient } from 'src/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { VirtuosoMockContext } from 'react-virtuoso'
import { Provider } from 'urql'
import { never } from 'wonka'
import { vitest } from 'vitest'

export function setup(ui: React.ReactNode) {
  return {
    user: userEvent.setup(),
    ...render(ui),
  }
}

function render(ui: React.ReactNode) {
  const mockClient = {
    executeQuery: vitest.fn(() => never),
    executeMutation: vitest.fn(() => never),
    executeSubscription: vitest.fn(() => never),
  }

  return testingLibraryRender(<>{ui}</>, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <Provider value={mockClient}>
        <VirtuosoMockContext.Provider value={{ viewportHeight: Infinity, itemHeight: 100 }}>
          <QueryClientProvider client={queryClient} /**persistOptions={{ persister }} */>
            <MantineProvider>{children}</MantineProvider>
          </QueryClientProvider>
        </VirtuosoMockContext.Provider>
      </Provider>
    ),
  })
}
