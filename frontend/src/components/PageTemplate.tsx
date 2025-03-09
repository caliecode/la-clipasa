import React, { type ReactElement } from 'react'
import { Container, Paper, useMantineColorScheme, useMantineTheme } from '@mantine/core'
import styles from './PageTemplate.module.css'
type PageTemplateProps = {
  children: ReactElement
  minWidth?: string | number
  maxWidth?: string | number
  sidePanel?: ReactElement
}

const PageTemplate = ({ children, minWidth, maxWidth, sidePanel }: PageTemplateProps) => {
  const theme = useMantineTheme()
  const { colorScheme } = useMantineColorScheme()

  return (
    <Container fluid className={styles.container}>
      <div
        style={{
          flex: 1,
          minWidth: window.innerWidth < 768 ? '90vw' : minWidth || 'auto',
          maxWidth: maxWidth || 'auto',
        }}
      >
        <Paper
          p="xs"
          shadow="lg"
          c={theme.primaryColor}
          bg={colorScheme === 'dark' ? theme.colors.gray[8] : theme.colors.gray[0]}
        >
          {children}
        </Paper>
      </div>

      {sidePanel && (
        <div
          className={'showOnLargeOnly'}
          style={{
            width: '30vw',
            position: 'sticky',
            top: 0,
          }}
        >
          <Paper
            p="md"
            shadow="lg"
            w="100%"
            c={theme.primaryColor}
            bg={colorScheme === 'dark' ? theme.colors.gray[8] : theme.colors.gray[0]}
          >
            {sidePanel}
          </Paper>
        </div>
      )}
    </Container>
  )
}

export default PageTemplate
