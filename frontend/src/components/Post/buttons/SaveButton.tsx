import { ActionIcon, Tooltip } from '@mantine/core'
import { IconBookmark } from '@tabler/icons'
import { useContext, useEffect, useState } from 'react'
import { usePostsSlice } from 'src/slices/posts'
import ProtectedComponent from 'src/components/Permissions/ProtectedComponent'
import { useUpdatePostMutation, useUpdateUserMutation } from 'src/graphql/gen'
import { usePostContext } from 'src/components/Post/Post.context'
import styles from './buttons.module.css'
import useAuthenticatedUser from 'src/hooks/auth/useAuthenticatedUser'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface SaveButtonProps {}

export default function SaveButton({}: SaveButtonProps) {
  const { post } = usePostContext()

  const [, updateUser] = useUpdateUserMutation()
  const [saveBeacon, setSaveBeacon] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  const { user } = useAuthenticatedUser()

  useEffect(() => {
    setIsSaved(!!user?.savedPosts?.find((sp) => sp.id === post?.id))
  }, [user?.savedPosts, post.id])

  const handleSaveButtonClick = async (e) => {
    e.stopPropagation()

    await updateUser({
      id: user?.id || '',
      input: { ...(!isSaved ? { addSavedPostIDs: [post.id] } : { removeSavedPostIDs: [post.id] }) },
    })

    setSaveBeacon(true)
    setIsSaved(!isSaved)
  }

  if (!post || !user) return null

  return (
    <ProtectedComponent requiredRole="GUEST">
      <Tooltip label="Bookmark" arrowPosition="center" withArrow>
        <ActionIcon
          className={`${isSaved && styles.savedAction} ${styles.action} ${saveBeacon ? styles.beacon : ''}`}
          onClick={handleSaveButtonClick}
          onAnimationEnd={() => setSaveBeacon(false)}
        >
          <IconBookmark
            size={18}
            color="var(--mantine-color-yellow-6)"
            stroke={1.5}
            {...(isSaved && { fill: 'var(--mantine-color-yellow-6)' })}
          />
        </ActionIcon>
      </Tooltip>
    </ProtectedComponent>
  )
}
