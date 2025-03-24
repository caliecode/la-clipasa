import { Card, Space, useMantineColorScheme } from '@mantine/core'
import { PaginatedPostResponse } from 'src/graphql/extended-types'
import { PostCore } from 'src/components/Post/Post.core'
import { Post } from './Post'
import { uniqueCategoryBackground, CardBackground } from 'src/services/categories'
import styles from './Post.module.css'
import { PostEmbed } from 'src/components/Post/components/Post.Embed'
import { usePostContext } from 'src/components/Post/Post.context'
import { PostSkeleton } from 'src/components/Post/components/Post.Skeleton'

export const PostPage = () => {
  const { colorScheme } = useMantineColorScheme()
  const { post } = usePostContext()

  return (
    <PostCore post={post}>
      {/* <PostSkeleton /> */}
      <Post />
      <Space h="xl" />
      <PostEmbed inline />
    </PostCore>
  )
}
