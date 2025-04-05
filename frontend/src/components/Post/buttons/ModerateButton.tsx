import { ActionIcon, Tooltip } from '@mantine/core'
import { IconShieldCheck, IconShieldOff } from '@tabler/icons'
import styles from './buttons.module.css'
import { usePostContext } from 'src/components/Post/Post.context'
import ProtectedComponent from 'src/components/Permissions/ProtectedComponent'
import { useUpdatePostMutation } from 'src/graphql/gen'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ModerateButtonProps {}

export default function ModerateButton({}: ModerateButtonProps) {
  const { post, setPost, calloutErrors, setCalloutErrors } = usePostContext()
  const [updatePostState, updatePost] = useUpdatePostMutation()

  const handleModerateButtonClick = async (e) => {
    e.stopPropagation()

    const res = await updatePost({
      id: post?.id,
      input: { base: { isModerated: !post.isModerated } },
    })
    if (res.error?.message !== undefined) {
      setCalloutErrors([res.error!.message])
    } else {
      setPost({
        ...post,
        isModerated: !post.isModerated,
      })
      setCalloutErrors([])
    }
  }

  if (!post) return null

  return (
    <ProtectedComponent requiredRole="MODERATOR">
      <Tooltip label={post.isModerated ? 'Mark as not moderated' : 'Approve'} arrowPosition="center" withArrow>
        <ActionIcon
          className={styles.action}
          onClick={handleModerateButtonClick}
          disabled={updatePostState.fetching}
          loading={updatePostState.fetching}
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
