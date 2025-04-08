import { Group, Container, Button, Space, Box, Card, ActionIcon, Tooltip } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { IconArrowLeft } from '@tabler/icons'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import dayjs from 'dayjs'
import { useEffect, useState, useRef, TouchEvent, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Post } from 'src/components/Post/components/Post'
import { PostEmbed } from 'src/components/Post/components/Post.Embed'
import { PostSkeleton } from 'src/components/Post/components/Post.Skeleton'
import { usePostContext } from 'src/components/Post/Post.context'

import { useRefreshDiscordLinkMutation } from 'src/graphql/gen'
import { useCardBackground } from 'src/hooks/post/usePostCardBackground'
import { usePostsSlice } from 'src/slices/posts'
import { parseUrl, uiPath } from 'src/ui-paths'
import { extractGqlErrors } from 'src/utils/errors'
import { getPostIdFromRoute, withBaseURL } from 'src/utils/urls'

const SWIPE_THRESHOLD = 50

export const PostPage = () => {
  const { posts, postActions } = usePostsSlice()
  const { post, setPost, setCalloutErrors } = usePostContext()
  const [refreshState, refreshDiscordLink] = useRefreshDiscordLinkMutation()
  const [refreshed, setRefreshed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const currentIndex = posts.findIndex((p) => p.id === post.id)
  const previousPost = currentIndex > 0 ? posts[currentIndex - 1] : null
  const nextPost = currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null
  const isSharedPost = window.location.search.includes('ref=share')

  const handleBackToList = () => {
    const indexToScroll = posts.findIndex((p) => p.id === post.id)
    if (indexToScroll !== -1) {
      postActions.setScrollToIndex(indexToScroll)
    } else {
      postActions.clearScrollToIndex()
    }

    navigate('/')
  }
  useEffect(() => {
    const handlePopState = (event) => {
      if (parseUrl(window.location.href)?.routePattern === '/') {
        handleBackToList()
      }
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [post.id, posts, postActions])

  const { image: categoryImage, color: categoryColor } = useCardBackground(post)
  const cardBackgroundImage = categoryImage || 'auto'

  const isMobile = useMediaQuery('(max-width: 768px)', window.innerWidth < 768)

  const swipeStartXRef = useRef(0)
  const swipeCurrentXRef = useRef(0)
  const isSwipingRef = useRef(false)

  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)
  const [swipeIntensity, setSwipeIntensity] = useState(0)

  const handleSwipeStart = (e: TouchEvent<HTMLDivElement>) => {
    swipeStartXRef.current = e.touches[0]!.clientX
    swipeCurrentXRef.current = e.touches[0]!.clientX
    isSwipingRef.current = true
    setSwipeDirection(null)
    setSwipeIntensity(0)
  }

  const handleSwipeMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!isSwipingRef.current || !e.touches[0]) return

    swipeCurrentXRef.current = e.touches[0]!.clientX
    const deltaX = swipeCurrentXRef.current - swipeStartXRef.current

    const intensity = Math.min(Math.abs(deltaX) / (window.innerWidth * 0.5), 0.4)
    setSwipeIntensity(intensity)

    if (deltaX > SWIPE_THRESHOLD / 3) {
      setSwipeDirection('right')
    } else if (deltaX < -SWIPE_THRESHOLD / 3) {
      setSwipeDirection('left')
    } else {
      setSwipeDirection(null)
    }
  }

  const handleSwipeEnd = () => {
    if (!isSwipingRef.current) return

    const deltaX = swipeCurrentXRef.current - swipeStartXRef.current
    let navigated = false

    if (deltaX > SWIPE_THRESHOLD && previousPost) {
      setPost(previousPost)
      navigated = true
    } else if (deltaX < -SWIPE_THRESHOLD && nextPost) {
      setPost(nextPost)
      navigated = true
    }

    swipeStartXRef.current = 0
    swipeCurrentXRef.current = 0
    isSwipingRef.current = false
    setSwipeDirection(null)

    if (!navigated) {
      setSwipeIntensity(0)
    } else {
      setSwipeIntensity(0)
    }
  }

  const showLeftIndicator = isMobile && previousPost && swipeDirection === 'right'
  const showRightIndicator = isMobile && nextPost && swipeDirection === 'left'
  const indicatorOpacity = swipeIntensity * 2

  useEffect(() => {
    const currentPostId = getPostIdFromRoute()
    if (post?.id && currentPostId !== post.id) {
      window.history.pushState(null, '', withBaseURL(uiPath('/post/:postId', { postId: post.id })))
    }
  }, [post])

  return (
    <Container fluid h="100dvh" p={0} m={0}>
      {!isSharedPost && (
        <Group justify="center">
          <Button
            onClick={handleBackToList}
            radius="xl"
            size="xs"
            variant="light"
            leftSection={<IconArrowLeft size={16} />}
          >
            Back to list view
          </Button>
        </Group>
      )}
      <Space h="sm" />
      <Group gap={0} align="stretch" wrap="nowrap">
        {!isSharedPost && !isMobile && (
          <Container p={0}>
            <Button
              variant="light"
              color="var(--mantine-primary-color-4)"
              radius={'var(--mantine-radius-md) 0px 0px var(--mantine-radius-md)'}
              h="100%"
              onClick={() => previousPost && setPost(previousPost)}
              disabled={!previousPost}
              aria-label="Previous Post"
              p={4}
            >
              <IconChevronLeft />
            </Button>
          </Container>
        )}

        <Card
          data-tour={isMobile ? 'swipe-area' : ''}
          radius={isMobile ? 'var(--mantine-radius-md)' : 'none'}
          p="md"
          w="100%"
          h="100%"
          shadow="none"
          onTouchStart={isMobile ? handleSwipeStart : undefined}
          onTouchMove={isMobile ? handleSwipeMove : undefined}
          onTouchEnd={isMobile ? handleSwipeEnd : undefined}
          style={{
            flexGrow: 1,
            position: 'relative',
            overflowY: 'auto',
            backgroundImage: post.deletedAt ? undefined : `url(${cardBackgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundBlendMode: 'overlay',
            backgroundColor: categoryColor,
            filter: post.deletedAt ? 'grayscale(80%)' : undefined,

            transition: 'background-color 0.3s ease, filter 0.3s ease',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {isMobile && (
            <>
              <Box
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: `translateY(-50%) scale(${showLeftIndicator ? 1 : 0.5})`,
                  opacity: showLeftIndicator ? indicatorOpacity : 0,
                  transition: 'transform 0.3s ease, opacity 0.3s ease',
                  zIndex: 1,
                  pointerEvents: 'none',
                }}
              >
                <IconChevronLeft
                  size="2rem"
                  color="white"
                  style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))' }}
                />
              </Box>

              <Box
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: `translateY(-50%) scale(${showRightIndicator ? 1 : 0.5})`,
                  opacity: showRightIndicator ? indicatorOpacity : 0,
                  transition: 'transform 0.3s ease, opacity 0.3s ease',
                  zIndex: 1,
                  pointerEvents: 'none',
                }}
              >
                <IconChevronRight
                  size="2rem"
                  color="white"
                  style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))' }}
                />
              </Box>
            </>
          )}

          <Post />
        </Card>

        {!isSharedPost && !isMobile && (
          <Container p={0}>
            <Button
              variant="light"
              color="var(--mantine-primary-color-4)"
              radius={'0px var(--mantine-radius-md) var(--mantine-radius-md) 0px'}
              h="100%"
              onClick={() => nextPost && setPost(nextPost)}
              disabled={!nextPost}
              aria-label="Next Post"
              p={4}
            >
              <IconChevronRight />
            </Button>
          </Container>
        )}
      </Group>

      <Space h="md" />
      <PostEmbed inline />
    </Container>
  )
}
