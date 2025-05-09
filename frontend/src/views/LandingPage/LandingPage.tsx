import { Text, Space, ScrollArea, Drawer, Flex, LoadingOverlay, Group, Loader, Button, Skeleton } from '@mantine/core'
import { useEffect, useRef, useState } from 'react'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso'
import PageTemplate from 'src/components/PageTemplate'
import SaveButton from 'src/components/Post/buttons/SaveButton'
import { PostCard } from 'src/components/Post/components/Post.Card'
import { PaginatedPostResponse } from 'src/graphql/extended-types'
import { PostFragment, QueryPostsArgs, usePostsQuery } from 'src/graphql/gen'
import { usePostsSlice } from 'src/slices/posts'
import PostFilters from 'src/components/PostFilters/PostFilters'
import styles from './LandingPage.module.css'
import { useUISlice } from 'src/slices/ui'
import { BorderSpinner } from 'react-social-media-embed'
import { PostCore } from 'src/components/Post/Post.core'
import { IconArrowUp } from '@tabler/icons-react'
import { parseUrl, uiPath } from 'src/ui-paths'
import { useLocation } from 'react-router-dom'
import { PostContextType } from 'src/components/Post/Post.context'
import { useTranslation } from 'react-i18next'
import { PostPage } from 'src/components/Post/components/Post.Page'
import { getPostIdFromRoute, withBaseURL } from 'src/utils/urls'
import { PostSkeleton } from 'src/components/Post/components/Post.Skeleton'
import { PostFiltersSkeleton } from 'src/components/PostFilters/PostFilters.Skeleton'

const itemHeight = 300
const scrollablePadding = 16

export default function LandingPage() {
  const [isSharedPost, setIsSharedPost] = useState<boolean | null>(null)
  const { queryParams, sort, scrollToIndexOnLoad, postActions, posts: allPosts } = usePostsSlice()
  const { burgerOpened, setBurgerOpened } = useUISlice()
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [activePostId, setActivePostId] = useState(getPostIdFromRoute())
  const location = useLocation()
  const { t } = useTranslation()

  const [posts, refetchPosts] = usePostsQuery({
    variables: activePostId && isSharedPost ? { where: { id: activePostId } } : queryParams,
    pause: isSharedPost === null,
  })
  const fetchedPostsCount = allPosts.length
  const totalCount = posts.data?.posts.totalCount
  const hasNextPage = posts.data?.posts.pageInfo.hasNextPage
  const virtuosoRef = useRef<VirtuosoHandle>(null)

  useEffect(() => {
    const isSharedPost = location.search.includes('ref=share') ? true : false
    setIsSharedPost(isSharedPost)

    const postId = getPostIdFromRoute()
    setActivePostId(postId)

    const isLast = postId === allPosts[allPosts.length - 1]?.id
    if (isLast) {
      handleFetchMorePosts()
    }
  }, [location, allPosts])

  const whereOrderByRef = useRef(buildQueryParamsRef(queryParams))

  useEffect(() => {
    const currentWhereOrderBy = buildQueryParamsRef(queryParams)

    if (whereOrderByRef.current !== currentWhereOrderBy) {
      window.history.pushState(null, '', withBaseURL(uiPath('/')))
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
      const newPosts = posts.data.posts.edges
        .map((e) => ({
          ...e!.node!,
          nodeId: e!.cursor,
        }))
        .filter((p) => !!p)

      if (isFetchingMore) {
        postActions.appendPosts(newPosts)
      } else {
        postActions.replacePosts(newPosts)
      }

      if (isFetchingMore) setIsFetchingMore(false)
    }
  }, [posts.data?.posts.edges, postActions])

  useEffect(() => {
    if (scrollToIndexOnLoad !== null && virtuosoRef.current && allPosts.length > scrollToIndexOnLoad) {
      virtuosoRef.current.scrollToIndex({
        index: scrollToIndexOnLoad,
        align: 'center',
        behavior: 'smooth',
      })
      postActions.clearScrollToIndex()
    }
  }, [scrollToIndexOnLoad, postActions, allPosts])

  function handleFetchMorePosts() {
    if (!posts.fetching && hasNextPage) {
      setIsFetchingMore(true)
      postActions.setCursor(posts?.data?.posts.pageInfo.endCursor)
    }
  }

  function handleScrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setShowBackToTop(false)
  }

  const activePost = allPosts.find((p) => p.id === activePostId)

  return (
    <PageTemplate minWidth={'60vw'} sidePanel={<PostFilters />}>
      <>
        {activePostId && activePost ? (
          <PostCore post={activePost} key={activePostId}>
            <PostPage />
          </PostCore>
        ) : (
          <Group justify="center">
            {totalCount !== undefined ? (
              <Text size="sm" fw={500} c="dimmed">
                {t('landingPage.postsFound', { count: totalCount })}
              </Text>
            ) : null}
            <Virtuoso
              ref={virtuosoRef}
              useWindowScroll
              style={{
                width: `calc(100% - ${scrollablePadding}px)`,
              }}
              data={allPosts}
              computeItemKey={(index, post) => post.id}
              fixedItemHeight={itemHeight}
              endReached={handleFetchMorePosts}
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
        )}

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

function buildQueryParamsRef(queryParams: QueryPostsArgs): string {
  return `${JSON.stringify(queryParams.where)}${JSON.stringify(queryParams.orderBy)}`
}
