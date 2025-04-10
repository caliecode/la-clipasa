import { Avatar, Flex, Group, Text } from '@mantine/core'
import { useContext } from 'react'
import { nameInitials } from 'src/utils/strings'
import dayjs from 'dayjs'
import { usePostContext } from 'src/components/Post/Post.context'
import { withBaseURL } from 'src/utils/urls'
import { useRelativeTimestamp } from 'src/utils/date'

export const PostMetadata = () => {
  const { post } = usePostContext()
  const { showRelativeTimestamp } = useRelativeTimestamp()

  return (
    <Group>
      <Avatar
        size={28}
        radius="xl"
        data-test-id="header-profile-avatar"
        alt={post.owner?.displayName}
        src={withBaseURL(post.owner?.profileImage)}
      >
        {nameInitials(post.owner?.displayName || '')}
      </Avatar>
      <Flex direction="column" justify="center" gap={0}>
        <Text size="sm" fw={500}>
          {post.owner?.displayName}
        </Text>
        <Text size="xs" c="dimmed">
          {showRelativeTimestamp(dayjs(post.createdAt)?.toISOString())}
        </Text>
      </Flex>
    </Group>
  )
}
