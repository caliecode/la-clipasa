import { ActionIcon, Tooltip } from '@mantine/core'
import { IconRefresh } from '@tabler/icons'
import { useQueryClient } from '@tanstack/react-query'
import { usePostsSlice } from 'src/slices/posts'
import styles from './buttons.module.css'

interface RestoreButtonProps {
  postId: string
}

export default function RestoreButton({ postId }: RestoreButtonProps) {
  const queryClient = useQueryClient()
  const { addCategoryFilter, removeCategoryFilter, getPostsQueryParams } = usePostsSlice()

  return (
    <Tooltip label="Restore" arrowPosition="center" withArrow>
      <ActionIcon
        style={{
          position: 'absolute',
          right: '20px',
        }}
        onClick={(e) => {
          e.stopPropagation()
          console.log('handle restore ')
          // TODO: implement deleted_at restore
        }}
        className={`${styles.action} restore-button`}
        size={'lg'}
        p={5}
      >
        <IconRefresh color="green" size={32} stroke={1.5} />
      </ActionIcon>
    </Tooltip>
  )
}
