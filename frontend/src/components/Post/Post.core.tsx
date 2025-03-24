import { useMantineColorScheme } from '@mantine/core'
import { PostProvider } from './Post.context'
import useAuthenticatedUser from 'src/hooks/auth/useAuthenticatedUser'
import { PostFragment } from 'src/graphql/gen'

export interface PostCoreProps {
  post: PostFragment & { nodeId: string }
  children: React.ReactNode
}

export const PostCore = ({ post, children }: PostCoreProps) => {
  const { colorScheme } = useMantineColorScheme()
  const { isAuthenticated, user } = useAuthenticatedUser()

  return <PostProvider post={post}>{children}</PostProvider>
}
