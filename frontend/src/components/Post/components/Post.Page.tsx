import { Group, Container, Button, Space, Box, Card } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons'
import { useEffect, useState } from 'react'
import { Post } from 'src/components/Post/components/Post'
import { PostEmbed } from 'src/components/Post/components/Post.Embed'
import { usePostContext } from 'src/components/Post/Post.context'
import { PostCore } from 'src/components/Post/Post.core'
import { useCardBackground } from 'src/hooks/ui/usePostCardBackground'
import { usePostsSlice } from 'src/slices/posts'
import { uiPath } from 'src/ui-paths'
import { getPostIdFromRoute, withBaseURL } from 'src/utils/urls'

export const PostPage = () => {
  const { posts } = usePostsSlice()
  const { post, setPost } = usePostContext()

  const currentIndex = posts.findIndex((p) => p.id === post.id)
  const previousPost = currentIndex > 0 ? posts[currentIndex - 1] : null
  const nextPost = currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null
  const isSharedPost = window.location.search.includes('ref=share')

  useEffect(() => {
    const currentPostId = getPostIdFromRoute()
    if (currentPostId === post.id) return

    window.history.pushState(null, '', withBaseURL(uiPath('/post/:postId', { postId: post.id })))
  }, [post])

  const { image: categoryImage, color: categoryColor } = useCardBackground(post)
  const cardBackgroundImage = categoryImage || 'auto'

  const isMobile = useMediaQuery('(max-width: 768px)')
  const [swipeStart, setSwipeStart] = useState(0)
  const [swipeEnd, setSwipeEnd] = useState(0)

  const handleSwipeStart = (e: React.TouchEvent) => {
    setSwipeStart(e.touches[0]!.clientX)
    setSwipeEnd(e.touches[0]!.clientX)
  }

  const handleSwipeMove = (e: React.TouchEvent) => {
    setSwipeEnd(e.touches[0]!.clientX)
  }

  const handleSwipeEnd = () => {
    if (!swipeStart || !swipeEnd) return

    const delta = swipeStart - swipeEnd
    const isLeftSwipe = delta > 30 // px
    const isRightSwipe = delta < -30

    if (isLeftSwipe && nextPost) {
      setPost(nextPost)
    } else if (isRightSwipe && previousPost) {
      setPost(previousPost)
    }

    // reset
    setSwipeStart(0)
    setSwipeEnd(0)
  }

  const currentDelta = swipeEnd - swipeStart
  const isSwipingRight = currentDelta > 0
  const isSwipingLeft = currentDelta < 0

  const swipePercentage = Math.min(Math.abs((swipeEnd - swipeStart) / 100), 0.3)

  return (
    <Container h="100vh" p={0} m={0} miw="100%">
      <Group gap={0} align="stretch" wrap="nowrap">
        {!isSharedPost && !isMobile && (
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
          radius={isMobile ? 'var(--mantine-radius-md)' : 'none'}
          w="100%"
          shadow="none"
          onTouchStart={handleSwipeStart}
          onTouchMove={handleSwipeMove}
          onTouchEnd={handleSwipeEnd}
          style={{
            backgroundImage: `url(${cardBackgroundImage})`,
            backgroundSize: 'cover',
            backgroundBlendMode: 'overlay',
            backgroundColor: categoryColor,
            filter: post.deletedAt ? 'grayscale(80%)' : undefined,
          }}
        >
          {isMobile && (
            <>
              <Box
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  transform: `translateY(-50%) translateX(${swipePercentage * 100}%)`,
                  opacity: previousPost && isSwipingRight ? swipePercentage / 2 : 0,
                  transition: 'transform 0.8s, opacity 0.2s',
                  zIndex: 1,
                }}
              >
                <IconChevronLeft size="2x" color="white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }} />
              </Box>
              <Box
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '50%',
                  transform: `translateY(-50%) translateX(-${swipePercentage * 100}%)`,
                  opacity: nextPost && isSwipingLeft ? swipePercentage / 2 : 0,
                  transition: 'transform 0.8s, opacity 0.2s',
                  zIndex: 1,
                }}
              >
                <IconChevronRight size="2x" color="white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }} />
              </Box>
            </>
          )}
          <Post />
        </Card>
        {!isSharedPost && !isMobile && (
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

      {/* TODO: dummy subreddit for uploads, in case its easier for some instead of uploading to yt, etc. */}
      <iframe
        id="reddit-embed"
        src="https://www.redditmedia.com/r/Caliebre/comments/1hqi2td/que_buen_truco/?ref\_source=embed\&amp;ref=share\&amp;embed=true"
        sandbox="allow-scripts allow-same-origin allow-popups"
        height="600px"
        width="100%"
        style={{ borderRadius: 10, border: 'none' }}
      ></iframe>
      {/* TODO: discord upload */}
      {/* <PostEmbed inline /> */}
    </Container>
  )
}
