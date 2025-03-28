import { Group, Space, Text } from '@mantine/core'
import { IconShieldOff } from '@tabler/icons-react'
import { PostMetadata } from './Post.Metadata'
import { PostContent } from './Post.Content'
import { PostActions } from './Post.Actions'
import { PostCallout } from 'src/components/Post/components/Post.Callout'
import { PostCategories } from 'src/components/Post/components/Post.Categories'
import { usePostContext } from 'src/components/Post/Post.context'
import { memo } from 'react'

interface PostProps {
  showCategories?: boolean
  showCommentCount?: boolean
  showModerationIcon?: boolean
}

const PostComponent = ({ showCategories = true, showCommentCount = true, showModerationIcon = true }: PostProps) => {
  const { post } = usePostContext()

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {!post.isModerated && (
        <IconShieldOff
          style={{
            position: 'absolute',
            top: '0',
            right: '0',
            maxWidth: '20%',
          }}
          color="red"
          height={40}
          width={40}
          opacity={0.5}
        />
      )}
      <PostCallout />
      <Group>
        <PostMetadata />
        <Space />
        {showCategories && !post.deletedAt && <PostCategories />}
      </Group>
      <Space h="md" />
      <PostContent />

      <Space h="sm" />

      <Group align="center">
        <PostActions />
        {showCommentCount && (
          <Text size="xs" c="dimmed">
            {post.comments.totalCount} comment{post.comments.totalCount === 1 ? '' : 's'}
          </Text>
        )}
      </Group>
    </div>
  )
}

export const Post = memo(PostComponent)
