import { ActionIcon, Tooltip, useMantineTheme } from '@mantine/core'
import { IconShare } from '@tabler/icons'
import styles from './buttons.module.css'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ShareButtonProps {}

export default function ShareButton({}: ShareButtonProps) {
  const theme = useMantineTheme()

  return (
    <Tooltip label="Share" arrowPosition="center" withArrow>
      <ActionIcon
        className={`${styles.action} `}
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <IconShare size={16} color={theme.colors.blue[6]} stroke={1.5} />
      </ActionIcon>
    </Tooltip>
  )
}
