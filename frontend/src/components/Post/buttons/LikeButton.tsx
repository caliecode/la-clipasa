import { ActionIcon, Button, Tooltip, useMantineTheme } from '@mantine/core'
import { IconBookmark, IconHeart } from '@tabler/icons'
import { useContext, useEffect, useState } from 'react'
import { usePostsSlice } from 'src/slices/posts'
import ProtectedComponent from 'src/components/Permissions/ProtectedComponent'
import { useUpdatePostMutation, useUpdateUserMutation } from 'src/graphql/gen'
import { usePostContext } from 'src/components/Post/Post.context'
import styles from './buttons.module.css'
import useAuthenticatedUser from 'src/hooks/auth/useAuthenticatedUser'
import { truncateIntegerToString } from 'src/utils/strings'
import { notifications } from '@mantine/notifications'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface LikeButtonProps {}

export default function LikeButton({}: LikeButtonProps) {
  const theme = useMantineTheme()
  const { post, setPost } = usePostContext()

  const [, updateUser] = useUpdateUserMutation()
  const [likeBeacon, setLikeBeacon] = useState(false)
  const [isLiked, setIsLiked] = useState(false)

  const { user, refetchUser } = useAuthenticatedUser()

  useEffect(() => {
    setIsLiked(!!user?.likedPosts?.find((sp) => sp.id === post?.id))
  }, [user?.likedPosts, post.id])

  const handleLikeButtonClick = async (e) => {
    e.stopPropagation()

    const r = await updateUser({
      id: user?.id || '',
      input: { ...(!isLiked ? { addLikedPostIDs: [post.id] } : { removeLikedPostIDs: [post.id] }) },
    })
    if (r?.error) {
      notifications.show({
        title: 'Error',
        message: `Could not ${isLiked ? 'unlike' : 'like'} post`,
        color: 'red',
        icon: <IconBookmark size={18} />,
      })
      return
    }

    setLikeBeacon(true)
    setIsLiked(!isLiked)
    setPost((p) => ({
      ...p,
      likedBy: {
        ...p.likedBy,
        totalCount: isLiked ? p.likedBy.totalCount - 1 : p.likedBy.totalCount + 1,
      },
    }))
    refetchUser()
  }

  if (!post) return null

  return (
    <Tooltip label="Like" arrowPosition="center" withArrow>
      <Button
        className={`${isLiked && styles.likedAction} ${styles.action} ${likeBeacon ? styles.beacon : ''}`}
        onClick={handleLikeButtonClick}
        onAnimationEnd={() => setLikeBeacon(false)}
        size="xs"
        disabled={!user}
        leftSection={
          <IconHeart
            size={18}
            color={theme.colors.red[6]}
            stroke={1.5}
            {...(isLiked && { fill: theme.colors.red[6] })}
          />
        }
      >
        {truncateIntegerToString(post.likedBy.totalCount)}
      </Button>
    </Tooltip>
  )
}
