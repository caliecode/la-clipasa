import { Card, Group, Space, Text, useMantineColorScheme } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconShieldOff } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PostCallout } from 'src/components/Post/components/Post.Callout'
import { usePostContext } from 'src/components/Post/Post.context'
import styles from '../Post.module.css'
import { uniqueCategoryBackground, CardBackground } from 'src/services/categories'
import { uiPath } from 'src/ui-paths'
import { PostMetadata } from './Post.Metadata'
import { PostCategories } from './Post.Categories'
import { PostContent } from './Post.Content'
import { PostActions } from './Post.Actions'
import { Post } from 'src/components/Post/components/Post'
import { PostModal } from 'src/components/Post/components/Post.Modal'

type PostCardProps = {
  className?: string
  backgroundImage?: string
} & React.ComponentPropsWithoutRef<'div'>

export const PostCard = ({ className, backgroundImage, ...htmlProps }: PostCardProps) => {
  const { post } = usePostContext()
  const { colorScheme } = useMantineColorScheme()
  const [fullScreenModal, setFullScreenModal] = useState(false)
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false)
  const navigate = useNavigate()

  const uniqueCategory = post?.categories?.find((c) => uniqueCategoryBackground[c.category])
  const cardBackground: CardBackground = uniqueCategory ? uniqueCategoryBackground[uniqueCategory.category] : undefined
  const cardBackgroundImage = backgroundImage ? backgroundImage : cardBackground ? cardBackground.image : 'auto'
  const cardBackgroundColor = cardBackground
    ? cardBackground.color(colorScheme)
    : colorScheme === 'dark'
      ? 'var(--mantine-color-gray-9)'
      : 'var(--mantine-color-gray-2)'

  return (
    <>
      <div
        onClick={() => {
          navigate(uiPath('/post/:postId', { postId: post.id }))
        }}
      >
        <Card
          {...htmlProps}
          p="lg"
          radius={12}
          className={`${styles.card} ${className ?? ''}`}
          style={{
            ...htmlProps.style,
            backgroundImage: `url(${cardBackgroundImage})`,
            backgroundSize: 'cover',
            backgroundBlendMode: 'overlay',
            backgroundColor: cardBackgroundColor,
            filter: post.deletedAt ? 'grayscale(80%)' : undefined,
          }}
        >
          <Post />
        </Card>
      </div>

      <PostModal
        isOpen={modalOpened}
        onClose={closeModal}
        isFullScreen={fullScreenModal}
        onToggleFullScreen={() => setFullScreenModal(!fullScreenModal)}
        post={post}
      />
    </>
  )
}
