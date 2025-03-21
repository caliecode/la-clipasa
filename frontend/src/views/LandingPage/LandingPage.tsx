import { Text, Space, ScrollArea, Drawer, Flex, LoadingOverlay, Group, Loader, Button } from '@mantine/core'
import { useEffect, useRef, useState } from 'react'
import { Virtuoso } from 'react-virtuoso'
import PageTemplate from 'src/components/PageTemplate'
import SaveButton from 'src/components/Post/buttons/SaveButton'
import { PostCard } from 'src/components/Post/components/Post.Card'
import { PaginatedPostResponse } from 'src/graphql/extended-types'
import { PostFragment, usePostsQuery } from 'src/graphql/gen'
import { usePostsSlice } from 'src/slices/posts'
import HomeSideActions from 'src/views/LandingPage/HomeSideActions'
import styles from './LandingPage.module.css'
import { useUISlice } from 'src/slices/ui'
import { BorderSpinner } from 'react-social-media-embed'
import { PostCore } from 'src/components/Post/Post.core'
import { IconArrowUp } from '@tabler/icons-react'

const itemHeight = 300
const scrollablePadding = 16

export default function LandingPage() {
  const [allPosts, setAllPosts] = useState<(PaginatedPostResponse & { nodeId: string })[]>([])
  const { queryParams, sort, postActions } = usePostsSlice()
  const { burgerOpened, setBurgerOpened } = useUISlice()
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [posts, refetchPosts] = usePostsQuery({
    variables: queryParams,
  })

  const whereOrderByRef = useRef(`${JSON.stringify(queryParams.where)}${JSON.stringify(queryParams.orderBy)}`)

  useEffect(() => {
    const currentWhereOrderBy = `${JSON.stringify(queryParams.where)}${JSON.stringify(queryParams.orderBy)}`

    if (whereOrderByRef.current !== currentWhereOrderBy) {
      setShowBackToTop(true)
      const timeout = setTimeout(() => {
        setShowBackToTop(false)
      }, 8_000)

      whereOrderByRef.current = currentWhereOrderBy

      return () => clearTimeout(timeout)
    }
  }, [queryParams.where, queryParams.orderBy])

  useEffect(() => {
    if (posts.data?.posts.edges) {
      setAllPosts((prev) => [
        ...(isFetchingMore ? prev : []),
        ...(posts.data?.posts.edges
          ?.map((e) => ({
            ...e!.node!,
            nodeId: e!.cursor,
          }))
          .filter((p) => !!p) ?? []),
      ])

      if (isFetchingMore) setIsFetchingMore(false)
    }
  }, [posts.data?.posts.edges])

  const fetchedPostsCount = allPosts.length
  const totalCount = posts.data?.posts.totalCount

  function handleScrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setShowBackToTop(false)
  }

  return (
    <PageTemplate minWidth={'60vw'} sidePanel={<HomeSideActions />}>
      <>
        <Group justify="center">
          {totalCount ? (
            <Text size="sm" fw={500} c="dimmed">
              Found {totalCount} post{totalCount === 1 ? '' : 's'}
            </Text>
          ) : null}
          <Virtuoso
            useWindowScroll
            style={{
              width: `calc(100% - ${scrollablePadding}px)`,
            }}
            data={allPosts}
            computeItemKey={(index, post) => post.id}
            fixedItemHeight={itemHeight}
            endReached={() => {
              if (fetchedPostsCount && !posts.fetching && posts.data?.posts.pageInfo.hasNextPage) {
                console.log('bottom reached')
                setIsFetchingMore(true)
                postActions.setCursor(posts?.data?.posts.pageInfo.endCursor)
              }
            }}
            /** overscan in pixels */
            overscan={{ main: 500, reverse: 300 }}
            itemContent={(index, post) => {
              if (!post) return null

              return (
                <div key={post.id}>
                  <AnimatedCard post={post} />
                  {index === fetchedPostsCount - 1 && isFetchingMore && (
                    <Group justify="center" p={12}>
                      <Loader size={40} />
                    </Group>
                  )}
                </div>
              )
            }}
          />
        </Group>

        {showBackToTop && (
          <Button
            onClick={handleScrollToTop}
            radius="xl"
            size="xs"
            variant="filled"
            color="blue"
            className={styles.backToTopButton}
            leftSection={<IconArrowUp size={16} />}
            bottom="calc(var(--footer-height) + 8px)"
            right="8px"
            style={{
              position: 'fixed',
              zIndex: 1000,
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
            }}
          >
            Back to Top
          </Button>
        )}
      </>
    </PageTemplate>
  )
}

const AnimatedCard = ({ post }) => {
  const [isVisible, setIsVisible] = useState(false)
  const cardRef = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      ref={cardRef}
      className={styles.animatedCard}
      style={{
        transform: isVisible ? 'scale(1)' : 'scale(0.9)',
        opacity: isVisible ? 1 : 0,
        transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
      }}
    >
      <PostCore post={post} key={post.id}>
        <PostCard style={{ marginBottom: 12, maxWidth: '100px' }} />
      </PostCore>
    </div>
  )
}
