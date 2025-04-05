import { Group } from '@mantine/core'

import CategoryBadge from 'src/components/CategoryBadge'
import LikeButton from 'src/components/Post/buttons/LikeButton'
import DeleteButton from 'src/components/Post/buttons/DeleteButton'
import EditButton from 'src/components/Post/buttons/EditButton'
import LastSeenButton from 'src/components/Post/buttons/LastSeenButton'
import ModerateButton from 'src/components/Post/buttons/ModerateButton'
import ShareButton from 'src/components/Post/buttons/ShareButton'
import SaveButton from 'src/components/Post/buttons/SaveButton'
import { usePostContext } from 'src/components/Post/Post.context'

export const PostActions = () => {
  const { post } = usePostContext()

  return (
    <Group gap={8}>
      {!post.deletedAt && (
        <>
          <LikeButton />
          <SaveButton />
          <LastSeenButton />
          <ShareButton />
          <EditButton />
          <ModerateButton />
        </>
      )}
      <DeleteButton />
    </Group>
  )
}
