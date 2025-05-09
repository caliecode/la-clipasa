import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { produce, WritableDraft } from 'immer'
import { PostCategoryCategory, PostOrder, PostWhereInput, QueryPostsArgs } from 'src/graphql/gen'
import { Nullable } from 'src/types/utils'
import { PostContextType } from 'src/components/Post/Post.context'

export const POSTS_SLICE_PERSIST_KEY = 'posts-slice'

export type SortSelectOption = 'creationDate' | 'lastSeen' | 'mostLiked' | 'approvedAt'

type PostsState = {
  lastSeenCursor: Nullable<string>
  sort: SortSelectOption
  queryParams: QueryPostsArgs
  posts: PostContextType['post'][]
  scrollToIndexOnLoad: number | null
  postActions: {
    replacePosts: (posts: PostContextType['post'][]) => void
    appendPosts: (posts: PostContextType['post'][]) => void
    resetPosts: () => void
    setSort: (sort: SortSelectOption) => void
    resetPagination: () => void
    setLastSeenCursor: (cursor: Nullable<string>) => void
    updateWhere: (updateFn: (where: PostWhereInput) => void) => void
    updateOrder: (updateFn: (order: PostOrder) => void) => void
    setTextFilter: (text: Nullable<string>) => void
    toggleCategory: (category: Nullable<PostCategoryCategory>) => void
    setCursor: (cursor: Nullable<string>) => void
    setScrollToIndex: (index: number | null) => void
    clearScrollToIndex: () => void
    // setState: (fn: (state: Omit<PostsState, 'postActions'>) => void) => void
  }
}

const initialState: Omit<PostsState, 'postActions'> = {
  lastSeenCursor: undefined,
  sort: 'approvedAt',
  scrollToIndexOnLoad: null,
  queryParams: {
    where: { isModerated: true },
    orderBy: { field: 'MODERATED_AT', direction: 'DESC' },
    first: 10,
  },
  posts: [],
}

export const usePostsSlice = create<PostsState>()(
  devtools(
    persist(
      (set) => {
        const _resetPagination = (state: WritableDraft<PostsState>) => {
          state.queryParams.after = undefined
          state.queryParams.before = undefined
        }

        const _updateOrder = (state: WritableDraft<PostsState>, updateFn: (order: PostOrder) => void) => {
          state.queryParams.orderBy ||= {} as PostOrder
          updateFn(state.queryParams.orderBy)
          _resetPagination(state)
          if (state.sort === 'lastSeen') {
            // starting point for last seen is always the last seen cursor
            state.queryParams.after = state.lastSeenCursor
          }
        }

        return {
          ...initialState,
          postActions: {
            setScrollToIndex: (index) => set({ scrollToIndexOnLoad: index }),
            clearScrollToIndex: () => set({ scrollToIndexOnLoad: null }),
            replacePosts: (newPosts) =>
              set(
                produce<PostsState>((state) => {
                  state.posts = newPosts
                }),
              ),
            appendPosts: (newPosts) =>
              set(
                produce<PostsState>((state) => {
                  state.posts.push(...newPosts)
                }),
              ),
            resetPosts: () =>
              set(
                produce<PostsState>((state) => {
                  state.posts = []
                }),
              ),

            setCursor: (cursor) =>
              set(
                produce<PostsState>((state) => {
                  state.queryParams.after = cursor
                }),
              ),
            setLastSeenCursor: (cursor) => set({ lastSeenCursor: cursor }),
            resetPagination: () => set(produce(_resetPagination)),

            setSort: (sort) =>
              set(
                produce<PostsState>((state) => {
                  state.sort = sort
                  state.queryParams.where ||= {}
                  state.queryParams.where.moderatedAtNotNil = false
                  _resetPagination(state)
                  switch (sort) {
                    case 'creationDate':
                      _updateOrder(state, (order) => {
                        order.field = 'CREATED_AT'
                      })
                      break
                    case 'approvedAt':
                      _updateOrder(state, (order) => {
                        order.field = 'MODERATED_AT'
                        state.queryParams.where!.moderatedAtNotNil = true
                      })
                      break

                    case 'lastSeen':
                      state.queryParams.after = state.lastSeenCursor
                      break
                    case 'mostLiked':
                      _updateOrder(state, (order) => {
                        order.field = 'LIKED_BY_COUNT'
                        order.direction = 'DESC'
                      })
                    default:
                      break
                  }
                }),
              ),

            updateWhere: (updateFn) =>
              set(
                produce<PostsState>((state) => {
                  state.queryParams.where ||= {}
                  updateFn(state.queryParams.where)
                  _resetPagination(state)
                }),
              ),

            updateOrder: (updateFn) =>
              set(
                produce<PostsState>((state) => {
                  _updateOrder(state, updateFn)
                }),
              ),
            setTextFilter: (text) =>
              set(
                produce<PostsState>((state) => {
                  state.queryParams.where ||= {}

                  if (text) {
                    state.queryParams.where.titleContains = text
                  } else {
                    delete state.queryParams.where.titleContains
                  }
                  _resetPagination(state)
                }),
              ),
            toggleCategory: (category) =>
              set(
                produce<PostsState>((state) => {
                  state.queryParams.where ||= {}
                  state.queryParams.where.hasCategoriesWith ||= [{ or: [] }]
                  const hasCategoriesWith = state.queryParams.where.hasCategoriesWith
                  const currentIdx = hasCategoriesWith?.findIndex((c) => c.or)
                  const catFilters = hasCategoriesWith[currentIdx]!.or!
                  const isCatFiltered = catFilters.some((c: any) => c.category === category)

                  const newFilters = isCatFiltered
                    ? catFilters.filter((c: any) => c.category !== category)
                    : [...(catFilters || []), { category }]

                  if (newFilters.length === 0) {
                    // would lead to empty predicate error
                    delete state.queryParams.where.hasCategoriesWith
                  } else {
                    state.queryParams.where.hasCategoriesWith[currentIdx]!.or = newFilters
                  }
                  _resetPagination(state)
                }),
              ),

            // setState: (fn) => set(produce<PostsState>(fn)),
            setQueryParams: (queryParams) =>
              set(
                produce<PostsState>((state) => {
                  state.queryParams = queryParams
                  _resetPagination(state)
                }),
              ),
          },
        }
      },
      {
        name: POSTS_SLICE_PERSIST_KEY,
        partialize: (state) =>
          ({
            sort: state.sort,
            lastSeenCursor: state.lastSeenCursor,
            queryParams: {
              ...state.queryParams,
              after: undefined,
              before: undefined,
              where: {
                ...state.queryParams.where,
                titleContains: undefined,
              },
            },
          }) as Omit<PostsState, 'postActions'>,
      },
    ),
  ),
)
