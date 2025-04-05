import { ActionIcon, Tooltip, useMantineTheme } from '@mantine/core'
import { IconEdit } from '@tabler/icons'
import { useQueryClient } from '@tanstack/react-query'
import { usePostsSlice } from 'src/slices/posts'
import styles from './buttons.module.css'
import ProtectedComponent from 'src/components/Permissions/ProtectedComponent'
import { usePostContext } from 'src/components/Post/Post.context'
import { checkAuthorization } from 'src/services/authorization'
import useAuthenticatedUser from 'src/hooks/auth/useAuthenticatedUser'
import EditPostModal from 'src/components/PostFilters/EditPostModal'
import { useDisclosure } from '@mantine/hooks'
import { PaginatedPostResponse } from 'src/graphql/extended-types'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface EditButtonProps {}

export default function EditButton({}: EditButtonProps) {
  const theme = useMantineTheme()
  const { user } = useAuthenticatedUser()
  const [opened, { open, close }] = useDisclosure(false)
  const { post, setPost } = usePostContext()

  const handleEditSuccess = (post: PaginatedPostResponse) => {
    console.log('Post updated successfully, refetching...')
    setPost(post)
  }

  const handleEditButtonClick = (e) => {
    e.stopPropagation()

    open()
  }

  const canEdit =
    (!post.isModerated && post.owner?.id === user?.id) ||
    checkAuthorization({ user, requiredRole: 'MODERATOR' }).authorized

  if (!canEdit) return null

  return (
    <>
      <Tooltip label={'Edit'} arrowPosition="center" withArrow>
        <ActionIcon className={styles.action} onClick={handleEditButtonClick}>
          <IconEdit size={16} color={theme.colors.blue[4]} stroke={1.5} />
        </ActionIcon>
      </Tooltip>
      <EditPostModal opened={opened} onClose={close} post={post} onSuccess={handleEditSuccess} />
    </>
  )
}
