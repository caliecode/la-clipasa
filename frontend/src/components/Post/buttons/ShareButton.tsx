import { ActionIcon, Tooltip, useMantineTheme } from '@mantine/core'
import { IconShare } from '@tabler/icons'
import styles from './buttons.module.css'
import { useNavigate } from 'react-router-dom'
import { uiPath } from 'src/ui-paths'
import { usePostContext } from 'src/components/Post/Post.context'
import { IconCopyCheck } from '@tabler/icons-react'
import { useState } from 'react'
import { withBaseURL } from 'src/utils/urls'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ShareButtonProps {}

export default function ShareButton({}: ShareButtonProps) {
  const theme = useMantineTheme()
  const { post } = usePostContext()
  const [copied, setCopied] = useState(false)

  return (
    <Tooltip label={copied ? 'Copied!' : 'Share'} arrowPosition="center" withArrow>
      <ActionIcon
        className={`${styles.action} `}
        onClick={(e) => {
          e.stopPropagation()
          const path = withBaseURL(uiPath('/post/:postId', { postId: post.id }))
          navigator.clipboard.writeText(window.location.origin + path)
          setCopied(true)
          setTimeout(() => setCopied(false), 4_000)
        }}
      >
        {copied ? (
          <IconCopyCheck size={16} color={theme.colors.green[6]} stroke={1.5} />
        ) : (
          <IconShare size={16} color={theme.colors.blue[6]} stroke={1.5} />
        )}
      </ActionIcon>
    </Tooltip>
  )
}
