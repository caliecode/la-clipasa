import { ActionIcon, Text, Tooltip, useMantineTheme } from '@mantine/core'
import { openConfirmModal } from '@mantine/modals'
import { showNotification } from '@mantine/notifications'
import { IconTrash } from '@tabler/icons'
import { InfiniteData, useQueryClient } from '@tanstack/react-query'
import { useContext, useState } from 'react'
import useAuthenticatedUser from 'src/hooks/auth/useAuthenticatedUser'
import { usePostsSlice } from 'src/slices/posts'
import styles from './buttons.module.css'
import { usePostContext } from 'src/components/Post/Post.context'
import { useDeletePostMutation, useUpdatePostMutation } from 'src/graphql/gen'
import { checkAuthorization } from 'src/services/authorization'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DeleteButtonButtonProps {}

export default function DeleteButton({}: DeleteButtonButtonProps) {
  const { post } = usePostContext()
  const [, deletePost] = useDeletePostMutation()
  const queryClient = useQueryClient()
  const { addCategoryFilter, removeCategoryFilter, getPostsQueryParams } = usePostsSlice()
  const { user, isAuthenticated } = useAuthenticatedUser()
  const theme = useMantineTheme()
  const [deleteButtonLoading, setDeleteButtonLoading] = useState(false)

  const canDeletePost =
    post.owner?.displayName === user?.id || checkAuthorization({ user, requiredRole: 'MODERATOR' }).authorized

  if (!post || !user || !canDeletePost) return null

  const openDeleteConfirmModal = () => {
    openConfirmModal({
      title: 'Delete post',
      children: <Text size="sm">This action is irreversible.</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onCancel: () => console.log('Cancel'),
      onConfirm: () => {
        setDeleteButtonLoading(true)
        deletePost({ deletePostId: post.id })
          .then(() => {
            console.log(`Post ${post.id} marked as deleted`)
            showNotification({
              id: 'post-deleted',
              title: 'Post deleted',
              message: 'Post deleted successfully',
              color: 'yellow',
              icon: <IconTrash size={18} />,
              autoClose: 3000,
            })
          })
          .catch((error) => {
            showNotification({
              id: 'post-delete-error',
              title: 'Error deleting post',
              message: error.message,
              color: 'red',
              icon: <IconTrash size={18} />,
              autoClose: 3000,
            })
          })
      },
    })
  }

  const handleDeleteButtonClick = (e) => {
    e.stopPropagation()

    openDeleteConfirmModal()
  }

  return (
    <Tooltip label="Delete" arrowPosition="center" withArrow>
      <ActionIcon onClick={handleDeleteButtonClick} className={styles.action} loading={deleteButtonLoading}>
        <IconTrash size={16} color={theme.colors.red[6]} stroke={1.5} />
      </ActionIcon>
    </Tooltip>
  )
}
