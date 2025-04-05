import React, { useEffect, useRef, useState, useMemo } from 'react'
import {
  Button,
  Group,
  Modal,
  Popover,
  Text,
  Textarea,
  TextInput,
  Tooltip,
  Space,
  useMantineTheme,
  FileInput, // Added for potential styling needs
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { showNotification } from '@mantine/notifications'
import { IconEyeCheck, IconSend, IconAlertTriangle, IconCircleCheck, IconUpload } from '@tabler/icons-react' // Removed IconUpload
import ErrorCallout from 'src/components/Callout/ErrorCallout'
import { CategoriesSelect } from 'src/components/CategorySelect'
import { PostCategoryNames } from 'src/services/categories' // Use full names for editing
import { emotesTextToHtml } from 'src/services/twitch'
import { useUISlice } from 'src/slices/ui'
import { sanitizeContentEditableInputBeforeSubmit } from 'src/utils/strings'
import { isValidURL } from 'src/utils/urls'
import { keys } from 'src/utils/object'
import styles from './PostFilters.module.css'
import useAuthenticatedUser from 'src/hooks/auth/useAuthenticatedUser'
import {
  PostFragment, // Use the Post fragment type
  UpdatePostInput,
  useUpdatePostMutation,
  useCreatePostCategoryMutation,
  useDeletePostCategoryMutation,
  PostCategoryCategory, // Import the enum type
} from 'src/graphql/gen'
import { extractGqlErrors } from 'src/utils/errors'
import { getServiceAndId } from 'src/services/linkServices'
import { CombinedError } from 'urql'
import { PaginatedPostResponse } from 'src/graphql/extended-types'

// Define the shape of the form data for editing
interface EditPostFormData {
  title: string
  link: string
  content?: string | null
  categories: PostCategoryCategory[] // Store enum values
}

type EditPostModalProps = {
  opened: boolean
  onClose: () => void
  post: PostFragment | null // The post to edit
  onSuccess: (post: PaginatedPostResponse) => void // Callback for successful update
}

export default function EditPostModal({ opened, onClose, post, onSuccess }: EditPostModalProps): JSX.Element | null {
  const { user } = useAuthenticatedUser() // Still useful for context, maybe permissions later
  const [updatePostMutation, updatePost] = useUpdatePostMutation()
  const [createCategoryMutation, createPostCategory] = useCreatePostCategoryMutation()
  const [deleteCategoryMutation, deletePostCategory] = useDeletePostCategoryMutation()

  const [titlePreviewPopoverOpened, setTitlePreviewPopoverOpened] = useState<boolean>(false)
  const [calloutErrors, setCalloutErrors] = useState<string[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null) // Video file upload commented out for edit
  const titleInputRef = useRef<HTMLTextAreaElement>(null)
  const EMOJI_SIZE = 24

  // Store initial categories to compare later
  const [initialCategories, setInitialCategories] = useState<Array<{ id: string; category: PostCategoryCategory }>>([])

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
        // Allow potentially expired discord links during edit, maybe backend refreshes?
        if (videoFile) return null // Video upload commented out
        if (!isValidURL(value)) return 'Link is not a valid URL'
        if (value?.length > 250) return 'Link can have at most 250 characters.'
      },
      content: (value) => (value && value.length > 400 ? 'Message can have at most 400 characters.' : null),
    },
  })

  // Effect to populate form when modal opens or post changes
  useEffect(() => {
    if (opened && post) {
      editPostForm.setValues({
        title: post.title || '',
        link: post.link || '',
        content: post.content || '',
        categories: post.categories?.map((c) => c.category) || [],
      })
      setInitialCategories(post.categories || [])
      setCalloutErrors([]) // Clear errors when opening
    } else if (!opened) {
      // Optional: Reset form when modal is closed externally
      // editPostForm.reset();
      // setInitialCategories([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, post]) // Rerun when modal opens or the specific post changes

  // Calculate category changes
  const categoriesToAdd = useMemo(() => {
    return editPostForm.values.categories.filter(
      (newCat) => !initialCategories.some((initialCat) => initialCat.category === newCat),
    )
  }, [editPostForm.values.categories, initialCategories])

  const categoriesToRemove = useMemo(() => {
    return initialCategories.filter((initialCat) => !editPostForm.values.categories.includes(initialCat.category))
  }, [editPostForm.values.categories, initialCategories])

  const handleSubmit = editPostForm.onSubmit(async (values) => {
    if (!post) return

    setCalloutErrors([])
    const encounteredErrors: CombinedError[] = []

    const updateInput: UpdatePostInput = {
      title: sanitizeContentEditableInputBeforeSubmit(values.title),
      link: values.link,
      content: values.content ? values.content : undefined,
      clearContent: !values.content,
    }

    try {
      // TODO: discord link update like CreatePostWithCategories
      const res = await updatePost({ id: post.id, input: updateInput })
      if (res.error) {
        encounteredErrors.push(res.error)
        throw res.error
      }

      for (const catToRemove of categoriesToRemove) {
        const delRes = await deletePostCategory({ id: catToRemove.id })
        if (delRes.error) encounteredErrors.push(delRes.error)
      }

      for (const catToAdd of categoriesToAdd) {
        const addRes = await createPostCategory({ input: { postID: post.id, category: catToAdd } })
        if (addRes.error) encounteredErrors.push(addRes.error)
      }

      if (encounteredErrors.length > 0) {
        const errorMessages = encounteredErrors.flatMap((err) => extractGqlErrors(err.graphQLErrors))
        if (errorMessages.length === 0) {
          errorMessages.push(...encounteredErrors.map((err) => err.message))
        }
        setCalloutErrors(errorMessages)
        return
      }

      if (!res.data?.updatePost?.post) {
        setCalloutErrors(['Failed to update post from response'])
      }
      onSuccess(res.data!.updatePost.post)
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
      if (encounteredErrors.length === 0 && error instanceof CombinedError) {
        encounteredErrors.push(error)
      }
      const errorMessages = encounteredErrors.flatMap((err) => extractGqlErrors(err.graphQLErrors))
      if (errorMessages.length === 0) {
        errorMessages.push(error instanceof Error ? error.message : 'Failed to update post')
      }
      setCalloutErrors(errorMessages)
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
          allowedCategories={keys(PostCategoryNames)}
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
            loading={updatePostMutation.fetching || createCategoryMutation.fetching || deleteCategoryMutation.fetching}
          >
            Update
          </Button>
        </Group>
      </form>
    </Modal>
  )
}
