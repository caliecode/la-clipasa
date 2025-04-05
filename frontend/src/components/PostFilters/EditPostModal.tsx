import React, { useEffect, useRef, useState } from 'react'
import { Button, Group, Modal, Popover, Text, Textarea, TextInput, Tooltip, Space, FileInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { showNotification } from '@mantine/notifications'
import { IconEyeCheck, IconSend, IconAlertTriangle, IconCircleCheck, IconUpload } from '@tabler/icons-react'
import ErrorCallout from 'src/components/Callout/ErrorCallout'
import { CategoriesSelect } from 'src/components/CategorySelect'
import { PostCategoryNames, PostCategoryNamesOnCreate } from 'src/services/categories'
import { emotesTextToHtml } from 'src/services/twitch'
import { sanitizeContentEditableInputBeforeSubmit } from 'src/utils/strings'
import { isValidURL } from 'src/utils/urls'
import { keys } from 'src/utils/object'
import styles from './PostFilters.module.css'
import useAuthenticatedUser from 'src/hooks/auth/useAuthenticatedUser'
import { PostFragment, UpdatePostInput, useUpdatePostMutation, PostCategoryCategory } from 'src/graphql/gen'
import { extractGqlErrors } from 'src/utils/errors'
import { getServiceAndId } from 'src/services/linkServices'
import { PaginatedPostResponse } from 'src/graphql/extended-types'

interface EditPostFormData {
  title: string
  link: string
  content?: string | null
  categories: PostCategoryCategory[]
}

type EditPostModalProps = {
  opened: boolean
  onClose: () => void
  post: PostFragment | null
  onSuccess: (post: PaginatedPostResponse) => void
}

export default function EditPostModal({ opened, onClose, post, onSuccess }: EditPostModalProps): JSX.Element | null {
  const { user } = useAuthenticatedUser()
  const [updatePostMutation, updatePost] = useUpdatePostMutation()

  const [titlePreviewPopoverOpened, setTitlePreviewPopoverOpened] = useState<boolean>(false)
  const [calloutErrors, setCalloutErrors] = useState<string[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const titleInputRef = useRef<HTMLTextAreaElement>(null)
  const EMOJI_SIZE = 24

  const editPostForm = useForm<EditPostFormData>({
    initialValues: {
      title: '',
      link: '',
      content: '',
      categories: [],
    },
    validate: {
      title: (value) => {
        if (!value || value.trim() === '' || value.trim() === '<br>') return 'Title cannot be empty'
        if (value?.length > 150) return 'Title can have at most 150 characters.'
      },
      link: (value) => {
        if (videoFile) return null
        if (!isValidURL(value)) return 'Link is not a valid URL'
        if (value?.length > 250) return 'Link can have at most 250 characters.'
      },
      content: (value) => (value && value.length > 400 ? 'Message can have at most 400 characters.' : null),
    },
  })

  useEffect(() => {
    if (opened && post) {
      editPostForm.setValues({
        title: post.title || '',
        link: post.link || '',
        content: post.content || '',
        categories: post.categories?.map((c) => c.category) || [],
      })
      setCalloutErrors([])
    }
  }, [opened, post])

  const handleSubmit = editPostForm.onSubmit(async (values) => {
    if (!post) return

    setCalloutErrors([])

    try {
      const updateInput: UpdatePostInput = {
        title: sanitizeContentEditableInputBeforeSubmit(values.title),
        link: values.link,
        content: values.content ? values.content : undefined,
        clearContent: !values.content,
      }

      const res = await updatePost({
        id: post.id,
        input: {
          base: updateInput,
          categories: editPostForm.values.categories,
          video: videoFile,
        },
      })

      if (res.error) {
        const errors = extractGqlErrors(res.error.graphQLErrors)
        if (errors.length === 0) errors.push(res.error.message)
        setCalloutErrors(errors)
        return
      }

      if (!res.data?.updatePostWithCategories?.post) {
        setCalloutErrors(['Failed to update post from response'])
        return
      }

      onSuccess(res.data.updatePostWithCategories.post)
      onClose()
      showNotification({
        id: 'post-updated',
        title: 'Post updated',
        message: 'Post updated successfully',
        color: 'green',
        icon: <IconSend size={18} />,
        autoClose: 5000,
      })
    } catch (error) {
      console.error('Post update error:', error)
      setCalloutErrors([error instanceof Error ? error.message : 'Failed to update post'])
    }
  })

  const unknownLinkService =
    editPostForm.values?.link && getServiceAndId(editPostForm.values?.link).service === 'unknown'

  if (!post) return null

  return (
    <Modal
      onClick={(e) => {
        e.stopPropagation()
      }}
      opened={opened}
      onClose={() => {
        onClose()
      }}
      title="Edit Post"
      closeOnEscape={false}
      closeOnClickOutside
    >
      <ErrorCallout title="Error updating post" errors={calloutErrors} />
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
                {...editPostForm.getInputProps('title')}
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
                __html: emotesTextToHtml(editPostForm.values.title, EMOJI_SIZE) || '',
              }}
            ></div>
          </Popover.Dropdown>
        </Popover>

        <TextInput
          withAsterisk
          rightSectionPointerEvents="all"
          rightSection={
            unknownLinkService ? (
              <Tooltip label="Unrecognized service. Embeds might not work.">
                <IconAlertTriangle size={16} color="var(--mantine-color-orange-5)" />
              </Tooltip>
            ) : (
              <IconCircleCheck size={16} color="var(--mantine-color-green-6)" />
            )
          }
          label="Link"
          {...editPostForm.getInputProps('link')}
        />
        {unknownLinkService && (
          <Text size="xs" opacity={0.6} c="var(--mantine-color-orange-5)">
            WARNING: unrecognized service. Embeds may not work correctly.
          </Text>
        )}

        <TextInput label="Content" {...editPostForm.getInputProps('content')} />
        <Text size="xs" opacity={0.6}>
          Optional: add a message
        </Text>

        <CategoriesSelect
          {...editPostForm.getInputProps('categories')}
          selectedCategories={editPostForm.values.categories || []}
          onCategoriesChange={(categories) => editPostForm.setFieldValue('categories', categories)}
          allowedCategories={keys(PostCategoryNamesOnCreate)}
        />
        <Space h="md" />

        <FileInput
          label="Replace Video (Optional)"
          placeholder="Select new video file to replace existing"
          accept="video/mp4,video/mpeg,video/quicktime"
          leftSection={<IconUpload size={16} />}
          value={videoFile}
          clearable
          onChange={(file) => {
            setVideoFile(file)
            editPostForm.setFieldValue('link', file ? '-' : post?.link || '')
          }}
        />
        <Text size="xs" opacity={0.6}>
          Optional: replace the current video (Max 10MB)
        </Text>

        <Group justify="end" mt="md">
          <Button
            variant="gradient"
            gradient={{ from: '#1864ab', to: '#326798', deg: 225 }}
            type="submit"
            loading={updatePostMutation.fetching}
          >
            Update
          </Button>
        </Group>
      </form>
    </Modal>
  )
}
