import { ActionIcon, Flex, Modal, ScrollArea, Text } from '@mantine/core'
import { IconArrowsMaximize, IconArrowsMinimize, IconX } from '@tabler/icons-react'
import { truncate } from 'lodash'
import { PostProvider } from 'src/components/Post/Post.context'
import { PostEmbed } from 'src/components/Post/components/Post.Embed'
import styles from '../Post.module.css'
import { emotesTextToHtml } from 'src/services/twitch'
import { PostCoreProps } from 'src/components/Post/Post.core'

interface PostModalProps {
  isOpen: boolean
  onClose: () => void
  isFullScreen: boolean
  onToggleFullScreen: () => void
  post: PostCoreProps['post']
}

export const PostModal = ({ isOpen, onClose, isFullScreen, onToggleFullScreen, post }: PostModalProps) => {
  return (
    <Modal
      styles={{
        title: {
          width: '100%',
        },
        content: {
          height: '80vh',
        },
      }}
      opened={isOpen}
      withCloseButton={false}
      onClose={onClose}
      fullScreen={isFullScreen}
      scrollAreaComponent={ScrollArea.Autosize}
      title={
        <Flex justify="space-between" direction="column" w="100%">
          <Flex direction="row" justify="space-between" align="center">
            <ActionIcon onClick={onToggleFullScreen}>
              {isFullScreen ? <IconArrowsMinimize size={16} /> : <IconArrowsMaximize size={16} />}
            </ActionIcon>
            <ActionIcon onClick={onClose} variant="subtle">
              <IconX size={16} />
            </ActionIcon>
          </Flex>
          <Flex justify="center" align="center">
            <Text
              fw={700}
              mt="xs"
              size="sm"
              style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              dangerouslySetInnerHTML={{ __html: emotesTextToHtml(truncate(post.title, { length: 60 }), 16) || '' }}
            />
          </Flex>
        </Flex>
      }
    >
      <PostProvider post={post}>
        <PostEmbed />
      </PostProvider>
    </Modal>
  )
}
