import { ActionIcon, Text, Tooltip, useMantineTheme } from '@mantine/core'
import { openConfirmModal } from '@mantine/modals'
import { showNotification } from '@mantine/notifications'
import { IconTrash, IconRefresh } from '@tabler/icons'
import { InfiniteData, useQueryClient } from '@tanstack/react-query'
import { useContext, useState } from 'react'
import useAuthenticatedUser from 'src/hooks/auth/useAuthenticatedUser'
import { usePostsSlice } from 'src/slices/posts'
import styles from './buttons.module.css'
import { usePostContext } from 'src/components/Post/Post.context'
import { useDeletePostMutation, useRestorePostMutation, useUpdatePostMutation } from 'src/graphql/gen'
import { checkAuthorization } from 'src/services/authorization'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DeleteButtonButtonProps {}

export default function DeleteButton({}: DeleteButtonButtonProps) {
  const { post, setPost } = usePostContext()
  const [, deletePost] = useDeletePostMutation()
  const queryClient = useQueryClient()
  const { user, isAuthenticated } = useAuthenticatedUser()
  const theme = useMantineTheme()
  const [buttonLoading, setButtonLoading] = useState(false)

  const canDeleteOrRestorePost =
    post.owner?.displayName === user?.id || checkAuthorization({ user, requiredRole: 'MODERATOR' }).authorized

  const [, restorePost] = useRestorePostMutation()
  const handleRestoreButtonClick = async (e) => {
    e.stopPropagation()

    setButtonLoading(true)
    const r = await restorePost({ id: post.id })
    if (r.error) {
      showNotification({
        id: 'post-restore-error',
        title: 'Error restoring post',
        message: r.error.message,
        color: 'red',
        icon: <IconRefresh size={18} />,
        autoClose: 3000,
      })
    } else {
      setPost({
        ...post,
        deletedAt: null,
      })
    }
    setButtonLoading(false)
  }

  if (!post || !user || !canDeleteOrRestorePost) return null

  const openDeleteConfirmModal = () => {
    openConfirmModal({
      title: 'Delete post',
      children: <Text size="sm">This action is irreversible.</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        setButtonLoading(true)
        deletePost({ deletePostId: post.id })
          .then(() => {
            showNotification({
              id: 'post-deleted',
              title: 'Post deleted',
              message: 'Post deleted successfully',
              color: 'yellow',
              icon: <IconTrash size={18} />,
              autoClose: 3000,
            })

            setPost({
              ...post,
              deletedAt: new Date(),
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
        setButtonLoading(false)
      },
    })
  }

  const handleDeleteButtonClick = (e) => {
    e.stopPropagation()

    openDeleteConfirmModal()
  }

  return (
    <Tooltip label={post.deletedAt ? 'Restore' : 'Delete'} arrowPosition="center" withArrow>
      {post.deletedAt ? (
        <ActionIcon onClick={handleRestoreButtonClick} className={styles.action} loading={buttonLoading}>
          <IconRefresh size={16} color={theme.colors.green[6]} stroke={1.5} />
        </ActionIcon>
      ) : (
        <ActionIcon onClick={handleDeleteButtonClick} className={styles.action} loading={buttonLoading}>
          <IconTrash size={16} color={theme.colors.red[6]} stroke={1.5} />
        </ActionIcon>
      )}
    </Tooltip>
  )
}
