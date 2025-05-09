import { ActionIcon, Text, Tooltip, useMantineTheme } from '@mantine/core'
import { openConfirmModal } from '@mantine/modals'
import { showNotification } from '@mantine/notifications'
import { IconTrash, IconRefresh } from '@tabler/icons'
import { InfiniteData, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const { post, setPost } = usePostContext()
  const [deletePostMutation, deletePost] = useDeletePostMutation()
  const { user, isAuthenticated } = useAuthenticatedUser()
  const theme = useMantineTheme()

  const canDeleteOrRestorePost =
    post.owner?.id === user?.id || checkAuthorization({ user, requiredRole: 'MODERATOR' }).authorized

  const [, restorePost] = useRestorePostMutation()
  const handleRestoreButtonClick = async (e) => {
    e.stopPropagation()

    const r = await restorePost({ id: post.id })
    if (r.error) {
      showNotification({
        id: 'post-restore-error',
        title: t('notifications.postRestoreErrorTitle'),
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
  }

  if (!post || !user || !canDeleteOrRestorePost) return null

  const handleDeleteButtonClick = (e) => {
    e.stopPropagation()

    deletePost({ deletePostId: post.id })
      .then(() => {
        showNotification({
          id: 'post-deleted',
          title: t('notifications.postDeletedTitle'),
          message: t('notifications.postDeletedMessage'),
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
          title: t('notifications.postDeleteErrorTitle'),
          message: error.message,
          color: 'red',
          icon: <IconTrash size={18} />,
          autoClose: 3000,
        })
      })
  }

  return (
    <Tooltip label={post.deletedAt ? t('common.restore') : t('common.delete')} arrowPosition="center" withArrow>
      {post.deletedAt ? (
        <ActionIcon onClick={handleRestoreButtonClick} className={styles.action} loading={deletePostMutation.fetching}>
          <IconRefresh size={16} color={theme.colors.green[6]} stroke={1.5} />{' '}
        </ActionIcon>
      ) : (
        <ActionIcon onClick={handleDeleteButtonClick} className={styles.action} loading={deletePostMutation.fetching}>
          <IconTrash size={16} color={theme.colors.red[6]} stroke={1.5} />
        </ActionIcon>
      )}
    </Tooltip>
  )
}
