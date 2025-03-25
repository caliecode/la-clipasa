/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react'
import { PaginatedPostResponse } from 'src/graphql/extended-types'
import { usePostsSlice } from 'src/slices/posts'

export interface PostContextType {
  post: PaginatedPostResponse & { nodeId: string }
  setPost: React.Dispatch<React.SetStateAction<PaginatedPostResponse>>
  calloutErrors: string[]
  setCalloutErrors: React.Dispatch<React.SetStateAction<string[]>>
}

const PostContext = createContext<PostContextType | undefined>(undefined)

export const usePostContext = () => {
  const context = useContext(PostContext)
  if (!context) throw new Error('usePostContext must be used within PostProvider')
  return context
}

export const PostProvider = ({
  children,
  post: initialPost,
}: {
  children: React.ReactNode
  post: PostContextType['post']
}) => {
  const { posts, postActions } = usePostsSlice()
  const [post, setPost] = useState(initialPost)
  const [calloutErrors, setCalloutErrors] = useState<string[]>([])

  useEffect(() => {
    // liked, saved, etc. downstream
    postActions.replacePosts(
      posts.map((p) => {
        if (p.id === post.id) {
          return {
            ...p,
            id: p.id,
          }
        }
        return p
      }),
    )
  }, [post])

  return (
    <PostContext.Provider value={{ post, setPost, calloutErrors, setCalloutErrors }}>{children}</PostContext.Provider>
  )
}
