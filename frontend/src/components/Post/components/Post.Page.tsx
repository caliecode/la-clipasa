import { PostMetadata } from './Post.Metadata'
import { PostContent } from './Post.Content'
import { PostActions } from './Post.Actions'
import { PaginatedPostResponse } from 'src/graphql/extended-types'
import { PostEmbed } from 'src/components/Post/components/Post.Embed'
import { PostCore } from 'src/components/Post/Post.core'

interface PostPageProps {
  post: PaginatedPostResponse & { nodeId: string }
}

export const PostPage = ({ post }: PostPageProps) => (
  <PostCore post={post}>
    <div className="post-page-container">
      <PostMetadata />
      <PostContent truncateLength={1000} />
      <PostEmbed inline />
      <div className="page-actions">
        <PostActions />
        {/* Additional page-specific components can be added here */}
      </div>
    </div>
  </PostCore>
)
