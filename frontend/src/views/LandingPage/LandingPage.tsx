import { Text, Space, ScrollArea, Drawer, Flex, LoadingOverlay, Group, Loader } from '@mantine/core'
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

const itemHeight = 300
const scrollablePadding = 16

export default function LandingPage() {
  const [allPosts, setAllPosts] = useState<(PaginatedPostResponse & { nodeId: string })[]>([])
  const { queryParams, sort, postActions } = usePostsSlice()
  const { burgerOpened, setBurgerOpened } = useUISlice()
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [posts, refetchPosts] = usePostsQuery({
    variables: queryParams,
  })

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
  const viewportRef = useRef<HTMLDivElement>(null)

  return (
    <PageTemplate minWidth={'60vw'} sidePanel={<HomeSideActions />}>
      <>
        <ScrollArea.Autosize
          h={3 * itemHeight + 100}
          type="scroll"
          viewportRef={viewportRef}
          onMouseDown={(event) => event.preventDefault()}
          styles={{
            root: {
              overflow: 'hidden',
            },
            viewport: {
              overflow: 'auto',
              scrollBehavior: 'smooth',
            },
          }}
        >
          <LoadingOverlay
            zIndex={10}
            visible={isFetchingMore}
            overlayProps={{ radius: 'sm', blur: 2 }}
            loaderProps={{
              children: (
                <Group align="center">
                  <Loader size={40} />
                  <Text ta="center" c="dimmed">
                    Loading more posts...
                  </Text>
                </Group>
              ),
            }}
          ></LoadingOverlay>
          <Virtuoso
            useWindowScroll
            style={{
              height: '100%',
              width: `calc(100% - ${scrollablePadding}px)`,
              overflow: 'visible',
              paddingLeft: `${scrollablePadding / 2}px`,
            }}
            customScrollParent={viewportRef.current!}
            fixedItemHeight={itemHeight}
            data={allPosts}
            increaseViewportBy={200}
            endReached={() => {
              if (fetchedPostsCount && !posts.fetching && posts.data?.posts.pageInfo.hasNextPage) {
                console.log('bottom reached')
                setIsFetchingMore(true)
                postActions.setCursor(posts?.data?.posts.pageInfo.endCursor)
              }
            }}
            /** overscan in pixels */
            // overscan={itemHeight * 2}
            itemContent={(index, post) => {
              // console.log('rendering item', post?.id)
              if (!post) return null

              return (
                <PostCard style={{ marginBottom: 12, maxWidth: '100px' }} key={post.id} post={post} className="post" />
              )
            }}
          />
        </ScrollArea.Autosize>
      </>
    </PageTemplate>
  )
}
