import React, { type ReactElement, useEffect, useState } from 'react'
import { Container, Paper, ScrollArea, useMantineColorScheme, useMantineTheme } from '@mantine/core'
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
          maxWidth: maxWidth || 'auto',
        }}
      >
        <Paper
          p="lg"
          shadow="lg"
          c={theme.primaryColor}
          bg={colorScheme === 'dark' ? theme.colors.gray[8] : theme.colors.gray[0]}
          h="100%"
        >
          {children}
        </Paper>
      </div>

      {sidePanel && (
        <aside className={styles.stickyAside}>
          <ScrollArea.Autosize h="100%" type="auto">
            <Paper
              p="md"
              shadow="lg"
              w="100%"
              c={theme.primaryColor}
              bg={colorScheme === 'dark' ? theme.colors.gray[8] : theme.colors.gray[0]}
            >
              {sidePanel}
            </Paper>
          </ScrollArea.Autosize>
        </aside>
      )}
    </Container>
  )
}

export default PageTemplate
