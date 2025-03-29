import React, { type ReactElement } from 'react'
import { Container, Paper, ScrollArea, useMantineColorScheme, useMantineTheme } from '@mantine/core'
import styles from './PageTemplate.module.css'
import { useMediaQuery } from '@mantine/hooks'

type PageTemplateProps = {
  children: ReactElement
  minWidth?: string | number
  maxWidth?: string | number
  sidePanel?: ReactElement
}

const PageTemplate = ({ children, minWidth, maxWidth, sidePanel }: PageTemplateProps) => {
  const theme = useMantineTheme()
  const { colorScheme } = useMantineColorScheme()
  const isMobile = useMediaQuery('(max-width: 768px)', window.innerWidth < 768)

  return (
    <Container fluid className={styles.container}>
      <Paper
        style={{
          flex: 1,
          maxWidth: maxWidth || '100%',
          minHeight: '100%',
        }}
        p={isMobile ? 'sm' : 'md'}
        shadow="lg"
        radius={isMobile ? 0 : 'sm'}
        bg={colorScheme === 'dark' ? theme.colors.gray[8] : theme.colors.gray[0]}
      >
        {children}
      </Paper>

      {sidePanel && (
        <aside className={styles.stickyAside}>
          <ScrollArea.Autosize mah="100%" type="auto">
            <Paper
              p="md"
              shadow="lg"
              w="100%"
              bg={colorScheme === 'dark' ? theme.colors.gray[8] : theme.colors.gray[0]}
              mih="100%"
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
