import ErrorCallout from 'src/components/Callout/ErrorCallout'
import { usePostContext } from 'src/components/Post/Post.context'
import { checkAuthorization } from 'src/services/authorization'
import useAuthenticatedUser from 'src/hooks/auth/useAuthenticatedUser'
import WarningCallout from 'src/components/Callout/WarningCallout'

export const PostCallout = () => {
  const { user } = useAuthenticatedUser()
  const { post, setCalloutErrors, calloutErrors } = usePostContext()
  const messages: string[] = []

  const canSeeModComments =
    checkAuthorization({ user, requiredRole: 'MODERATOR' }).authorized || (user?.id && post.owner?.id === user?.id)

  if (post.moderationComment && !post.isModerated && canSeeModComments) messages.push(post.moderationComment)

  return (
    <>
      {messages.length > 0 ? <WarningCallout title="Moderator comments" warnings={messages} /> : null}
      {calloutErrors && calloutErrors.length > 0 ? <ErrorCallout title="Error" errors={calloutErrors} /> : null}
    </>
  )
}
