import * as React from 'react'

import { test } from 'vitest'
import UserPermissionsPage from 'src/views/Settings/UserPermissionsPage/UserPermissionsPage'
import '../../../i18n' // Import i18n configuration
import { setup } from 'src/test-utils/render'

test('Renders content', async () => {
  setup(<UserPermissionsPage />)
})
