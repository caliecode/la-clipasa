import { ActionIcon, Tooltip } from '@mantine/core'
import { IconEye } from '@tabler/icons'
import { useContext, useState } from 'react'
import useAuthenticatedUser from 'src/hooks/auth/useAuthenticatedUser'
import { usePostsSlice } from 'src/slices/posts'
import { useUISlice } from 'src/slices/ui'
import styles from './buttons.module.css'
import { usePostContext } from 'src/components/Post/Post.context'
import dayjs from 'dayjs'
import { useUpdateUserMutation } from 'src/graphql/gen'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface LastSeenButtonProps {}

export default function LastSeenButton({}: LastSeenButtonProps) {
  const { post } = usePostContext()
  const [, updateUser] = useUpdateUserMutation()
  const { isAuthenticated, user, refetchUser } = useAuthenticatedUser()
  /**
   * TODO background image if lastSeenCursor !== post.id overriding existing one (or some kind of filter)
   */
  const { postActions, lastSeenCursor } = usePostsSlice()

  const [lastSeenBeacon, setLastSeenBeacon] = useState(false)

  const handleLastSeenButtonClick = async (e) => {
    e.stopPropagation()
    console.log(`last seen nodeId: ${post.nodeId}`)
    const res = await updateUser({
      id: user?.id || '',
      input: { lastPostSeenCursor: post.nodeId },
    })

    // if ok, update our user query cache from urql
    if (res.data?.updateUser.user) {
      postActions.setLastSeenCursor(post.nodeId)
      refetchUser()
    }
  }

  if (lastSeenCursor === post.nodeId || !isAuthenticated) return null

  return (
    <Tooltip label={lastSeenCursor === post.nodeId ? '' : 'Mark as last seen'} arrowPosition="center" withArrow>
      <ActionIcon
        className={`${styles.action} ${lastSeenBeacon ? 'beacon' : ''}`}
        onClick={handleLastSeenButtonClick}
        onAnimationEnd={() => setLastSeenBeacon(false)}
      >
        <IconEye size={16} stroke={1.5} />
      </ActionIcon>
    </Tooltip>
  )
}
