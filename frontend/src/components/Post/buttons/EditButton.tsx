import { ActionIcon, Tooltip, useMantineTheme } from '@mantine/core'
import { IconEdit } from '@tabler/icons'
import { useQueryClient } from '@tanstack/react-query'
import { usePostsSlice } from 'src/slices/posts'
import styles from './buttons.module.css'
import ProtectedComponent from 'src/components/Permissions/ProtectedComponent'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface EditButtonProps {}

export default function EditButton({}: EditButtonProps) {
  const theme = useMantineTheme()

  const handleEditButtonClick = (e) => {
    e.stopPropagation()
  }

  return (
    <ProtectedComponent requiredRole="MODERATOR">
      <Tooltip label={'Edit'} arrowPosition="center" withArrow>
        <ActionIcon className={styles.action} onClick={handleEditButtonClick}>
          <IconEdit size={16} color={theme.colors.blue[4]} stroke={1.5} />
        </ActionIcon>
      </Tooltip>
    </ProtectedComponent>
  )
}
