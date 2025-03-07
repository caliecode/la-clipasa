import { ActionIcon, Tooltip } from '@mantine/core'
import { IconShieldCheck, IconShieldOff } from '@tabler/icons'
import { InfiniteData, useQueryClient } from '@tanstack/react-query'
import { useContext, useEffect, useState } from 'react'
import { usePostsSlice } from 'src/slices/posts'
import styles from './buttons.module.css'
import { usePostContext } from 'src/components/Post/Post.context'
import ProtectedComponent from 'src/components/Permissions/ProtectedComponent'
import { useUpdatePostMutation } from 'src/graphql/gen'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ModerateButtonProps {}

export default function ModerateButton({}: ModerateButtonProps) {
  const { post } = usePostContext()
  const queryClient = useQueryClient()
  const { addCategoryFilter, removeCategoryFilter, getPostsQueryParams } = usePostsSlice()
  const [updatePostState, updatePost] = useUpdatePostMutation()

  const [moderateButtonLoading, setModerateButtonLoading] = useState(false)

  useEffect(() => {
    if (!updatePostState.fetching) {
      setModerateButtonLoading(false)
    }
  }, [updatePostState])

  const handleModerateButtonClick = (e) => {
    e.stopPropagation()

    setModerateButtonLoading(true)
    updatePost({
      id: post?.id,
      input: { isModerated: !post.isModerated },
    })
  }

  if (!post) return null

  return (
    <ProtectedComponent requiredRole="MODERATOR">
      <Tooltip label={post.isModerated ? 'Mark as not moderated' : 'Approve'} arrowPosition="center" withArrow>
        <ActionIcon
          className={styles.action}
          onClick={handleModerateButtonClick}
          disabled={moderateButtonLoading}
          loading={moderateButtonLoading}
        >
          {post.isModerated ? (
            <IconShieldOff size={16} color={'red'} stroke={1.5} />
          ) : (
            <IconShieldCheck size={16} color={'lime'} stroke={1.5} />
          )}
        </ActionIcon>
      </Tooltip>
    </ProtectedComponent>
  )
}
