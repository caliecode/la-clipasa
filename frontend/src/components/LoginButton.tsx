import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button, useMantineTheme } from '@mantine/core'
import { apiPath } from 'src/services/apiPaths'
import { faSignIn } from '@fortawesome/free-solid-svg-icons'
import { redirectToUserAuthLogin } from 'src/services/authorization'
import { faTwitch } from '@fortawesome/free-brands-svg-icons'

export default function LoginButton() {
  const { colors } = useMantineTheme()

  return (
    <Button
      onClick={(e) => {
        e.preventDefault()
        redirectToUserAuthLogin()
      }}
      style={{
        backgroundColor: '#a970ff',
      }}
      leftSection={<FontAwesomeIcon icon={faTwitch} size="xl" />}
    >
      Login
    </Button>
  )
}
