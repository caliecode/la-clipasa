import React, { useEffect, useRef, useState } from 'react'
import {
  Button,
  Group,
  Modal,
  Popover,
  Text,
  Textarea,
  TextInput,
  Tooltip,
  FileInput,
  Stack,
  Progress,
  Space,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { showNotification } from '@mantine/notifications'
import { IconEyeCheck, IconSend, IconUpload, IconVideo } from '@tabler/icons-react'
import { useMutation } from 'urql'
import axios from 'axios'
import ErrorCallout from 'src/components/Callout/ErrorCallout'
import { CategoriesSelect } from 'src/components/CategorySelect'
import { PostCategoryNamesOnCreate } from 'src/services/categories'
import { emotesTextToHtml } from 'src/services/twitch'
import { useUISlice } from 'src/slices/ui'
import { sanitizeContentEditableInputBeforeSubmit } from 'src/utils/strings'
import { isValidURL } from 'src/utils/urls'
import { keys } from 'src/utils/object'
import styles from './PostFilters.module.css'
import useAuthenticatedUser from 'src/hooks/auth/useAuthenticatedUser'
import { useNavigate } from 'react-router-dom'
import { apiPath } from 'src/services/apiPaths'
import { CreatePostInput, CreatePostWithCategoriesInput, useCreatePostMutation } from 'src/graphql/gen'
import { uiPath } from 'src/ui-paths'
import { extractGqlErrors } from 'src/utils/errors'
import { IconAlertTriangle, IconCircleCheck } from '@tabler/icons'
import { getServiceAndId } from 'src/services/linkServices'

type CreatePostModalProps = {
  opened: boolean
  onClose: () => void
}

export default function CreatePostModal({ opened, onClose }: CreatePostModalProps): JSX.Element {
  const { user } = useAuthenticatedUser()
  const navigate = useNavigate()
  const [createPostMutation, createPost] = useCreatePostMutation()
  const { setBurgerOpened } = useUISlice()

  const [titlePreviewPopoverOpened, setTitlePreviewPopoverOpened] = useState<boolean>(false)
  const [calloutErrors, setCalloutErrors] = useState<string[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const titleInputRef = useRef<HTMLTextAreaElement>(null)
  const EMOJI_SIZE = 24

  const postCreateForm = useForm<CreatePostWithCategoriesInput>({
    initialValues: {
      base: {} as CreatePostInput,
      categories: [],
    },
    validate: {
      base: {
        title: (value) => {
          if (!value || value.trim() === '' || value.trim() === '<br>') return 'Title cannot be empty'
          if (value?.length > 150) return 'Title can have at most 150 characters.'
        },
        link: (value) => {
          if (videoFile) return null
          if (!isValidURL(value)) return 'Link is not a valid URL'
          if (value?.length > 250) 'Link can have at most 250 characters.'
        },
        content: (value) => (value && value.length > 400 ? 'Message can have at most 400 characters.' : null),
      },
    },
  })

  useEffect(() => {
    user?.id && postCreateForm.setFieldValue('base.ownerID', user.id)
  }, [user])

  const handleSubmit = postCreateForm.onSubmit(async (values) => {
    values.base.title = sanitizeContentEditableInputBeforeSubmit(values.base.title)

    try {
      values.base.title = sanitizeContentEditableInputBeforeSubmit(values.base.title)
      const res = await createPost({ input: { ...values, video: videoFile } })

      if (res.error) {
        const errors = extractGqlErrors(res.error.graphQLErrors)
        if (errors.length === 0) errors.push(res.error.message)

        setCalloutErrors(errors)
        return
      }

      onClose()
      setBurgerOpened(false)
      showNotification({
        id: 'post-created',
        title: 'Post submitted',
        message: 'Post created successfully',
        color: 'green',
        icon: <IconSend size={18} />,
        autoClose: 5000,
      })

      const newPostId = res.data?.createPostWithCategories.post.id
      if (newPostId) navigate(`${uiPath('/post/:postId', { postId: newPostId })}?ref=share`)
    } catch (error) {
      console.error('Post creation error:', error)
      setCalloutErrors([error instanceof Error ? error.message : 'Failed to create post'])
    }
  })

  const unknownLinkService =
    postCreateForm.values?.base?.link &&
    getServiceAndId(postCreateForm.values?.base?.link).service === 'unknown' &&
    videoFile === null

  return (
    <Modal
      opened={opened}
      onClose={() => {
        onClose()
        // Reset form and video state when modal closes
        postCreateForm.reset()
        setVideoFile(null)
      }}
      title="Create a new post"
      closeOnEscape={false}
    >
      <ErrorCallout title="Error uploading post" errors={calloutErrors} />
      <form onSubmit={handleSubmit}>
        <Popover
          opened={titlePreviewPopoverOpened}
          classNames={{ dropdown: styles.popoverDropdown }}
          position="right"
          withArrow
          shadow="md"
        >
          <Popover.Target>
            <div>
              <Textarea
                {...postCreateForm.getInputProps('base.title')}
                ref={titleInputRef}
                data-autofocus
                withAsterisk
                label="Title"
                placeholder="Enter a title"
                onClick={() => setTitlePreviewPopoverOpened(true)}
                onFocus={() => setTitlePreviewPopoverOpened(true)}
                onBlur={() => setTitlePreviewPopoverOpened(false)}
                rightSection={
                  <Tooltip label="Preview">
                    <Group>
                      <IconEyeCheck
                        color="#4077aa"
                        size={20}
                        className={styles.iconClickable}
                        onClick={() => setTitlePreviewPopoverOpened(!titlePreviewPopoverOpened)}
                      />
                    </Group>
                  </Tooltip>
                }
                autosize
                minRows={2}
              />
              <Text size="xs" opacity={0.6}>
                You can use channel emotes here.
              </Text>
            </div>
          </Popover.Target>
          <Popover.Dropdown>
            <div
              dangerouslySetInnerHTML={{
                __html: emotesTextToHtml(postCreateForm.values.base.title, EMOJI_SIZE) || '',
              }}
            ></div>
          </Popover.Dropdown>
        </Popover>
        <TextInput
          withAsterisk
          rightSectionPointerEvents="all"
          rightSection={
            unknownLinkService ? (
              <IconAlertTriangle size={16} color="var(--mantine-color-red-5)" />
            ) : (
              <IconCircleCheck size={16} color="var(--mantine-color-green-6)" />
            )
          }
          label="Link"
          {...postCreateForm.getInputProps('base.link')}
        />
        {unknownLinkService && (
          <Text size="xs" opacity={0.6} c="var(--mantine-color-red-5)">
            WARNING: unrecognized service. Embeds will not work
          </Text>
        )}
        <TextInput label="Content" {...postCreateForm.getInputProps('base.content')} />
        <Text size="xs" opacity={0.6}>
          Optional: add a message
        </Text>
        <CategoriesSelect
          {...postCreateForm.getInputProps('categories')}
          selectedCategories={postCreateForm.values.categories || []}
          onCategoriesChange={(categories) => postCreateForm.setFieldValue('categories', categories)}
          allowedCategories={keys(PostCategoryNamesOnCreate)}
        />
        <Space h="md" />
        <FileInput
          label="Video Upload"
          placeholder="Select video file"
          accept="video/mp4,video/mpeg,video/quicktime"
          leftSection={<IconUpload size={16} />}
          value={videoFile}
          clearable
          onChange={(file) => {
            setVideoFile(file)
            postCreateForm.setFieldValue('video', '')
            postCreateForm.setFieldValue('base.link', '-')
          }}
        />
        <Text size="xs" opacity={0.6}>
          Optional: upload a video (Max 10MB)
        </Text>

        <Group justify="end" mt="md">
          <Button
            variant="gradient"
            gradient={{ from: '#1864ab', to: '#326798', deg: 225 }}
            type="submit"
            loading={createPostMutation.fetching}
          >
            Submit
          </Button>
        </Group>
      </form>
    </Modal>
  )
}
