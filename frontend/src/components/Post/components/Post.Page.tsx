import { Group, Container, Button, Space, Box, Card } from '@mantine/core'
import { useEffect } from 'react'
import { Post } from 'src/components/Post/components/Post'
import { PostEmbed } from 'src/components/Post/components/Post.Embed'
import { usePostContext } from 'src/components/Post/Post.context'
import { PostCore } from 'src/components/Post/Post.core'
import { useCardBackground } from 'src/hooks/ui/usePostCardBackground'
import { usePostsSlice } from 'src/slices/posts'

export const PostPage = () => {
  const { posts } = usePostsSlice()
  const { post, setPost } = usePostContext()

  const currentIndex = posts.findIndex((p) => p.id === post.id)
  const previousPost = currentIndex > 0 ? posts[currentIndex - 1] : null
  const nextPost = currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null
  const isSharedPost = window.location.search.includes('ref=share')

  useEffect(() => {
    if (posts.length > 0) {
      console.log('posts', posts)
      console.log('prev post', previousPost)
      console.log('next post', nextPost)
    }
  }, [posts, previousPost, nextPost])

  const { image: categoryImage, color: categoryColor } = useCardBackground(post)
  const cardBackgroundImage = categoryImage || 'auto'

  return (
    <>
      <Group gap={0} align="stretch" wrap="nowrap">
        {!isSharedPost && (
          <Container p={0}>
            <Button
              variant="filled"
              radius={'var(--mantine-radius-md) 0px 0px var(--mantine-radius-md)'}
              h="100%"
              onClick={() => previousPost && setPost(previousPost)}
              disabled={!previousPost}
            >
              ←
            </Button>
          </Container>
        )}
        <Card
          radius="none"
          w="100%"
          shadow="none"
          style={{
            backgroundImage: `url(${cardBackgroundImage})`,
            backgroundSize: 'cover',
            backgroundBlendMode: 'overlay',
            backgroundColor: categoryColor,
            filter: post.deletedAt ? 'grayscale(80%)' : undefined,
          }}
        >
          <Post />
        </Card>
        {!isSharedPost && (
          <Container p={0}>
            <Button
              variant="filled"
              radius={'0px var(--mantine-radius-md) var(--mantine-radius-md) 0px'}
              h="100%"
              onClick={() => nextPost && setPost(nextPost)}
              disabled={!nextPost}
            >
              →
            </Button>
          </Container>
        )}
      </Group>
      <Space h="xl" />
      <PostEmbed inline />
    </>
  )
}
