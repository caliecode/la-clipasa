import { Avatar, Flex, Group, Text } from '@mantine/core'
import { useContext } from 'react'
import { nameInitials } from 'src/utils/strings'
import { showRelativeTimestamp } from 'src/utils/date'
import dayjs from 'dayjs'
import { usePostContext } from 'src/components/Post/Post.context'

export const PostMetadata = () => {
  const { post } = usePostContext()

  return (
    <Group>
      <Avatar
        size={28}
        radius="xl"
        data-test-id="header-profile-avatar"
        alt={post.owner?.displayName}
        src={post.owner?.profileImage}
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
