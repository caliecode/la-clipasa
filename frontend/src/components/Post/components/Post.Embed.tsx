import { InstagramEmbed, TikTokEmbed, XEmbed, YouTubeEmbed } from 'react-social-media-embed'
import { usePostContext } from '../Post.context'
import { getServiceAndId } from 'src/services/linkServices'
import styles from '../Post.module.css'
import { useMantineColorScheme } from '@mantine/core'
interface PostEmbedProps {
  inline?: boolean
}

export const PostEmbed = ({ inline = false }: PostEmbedProps) => {
  const { post } = usePostContext()
  const { id, service } = getServiceAndId(post.link)
  const { colorScheme } = useMantineColorScheme()
  const embedStyle: React.CSSProperties = inline
    ? { maxWidth: '100%', height: '100%' }
    : { overflow: 'scroll', maxWidth: '50vw' }

  const renderEmbed = () => {
    switch (service) {
      case 'instagram':
        return <InstagramEmbed url={post.link} width="100%" />
      case 'twitter':
        return <XEmbed url={post.link} width="100%" />
      case 'youtube':
        return <YouTubeEmbed url={post.link} width="100%" />
      case 'tiktok':
        return <TikTokEmbed url={post.link} width="100%" />
      default:
        return null
    }
  }

  return <div style={embedStyle}>{renderEmbed()}</div>
}
