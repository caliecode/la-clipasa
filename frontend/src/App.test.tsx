import { BrowserRouter } from 'react-router-dom'
import { test, vi, vitest } from 'vitest'
import React from 'react' // fix vitest
import './i18n' // Import i18n configuration
import App from 'src/App'

test('Renders content', async () => {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
})
