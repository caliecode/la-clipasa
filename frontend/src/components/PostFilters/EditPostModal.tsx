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
  Space,
  FileInput,
  Input,
} from '@mantine/core'
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
import { EmoteInput } from 'src/components/EmoteInput'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()

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
        if (!value || value.trim() === '' || value.trim() === '<br>') return t('validation.title.required')
        if (value?.length > 150) return t('validation.title.maxLength', { count: 150 })
      },
      link: (value) => {
        if (videoFile) return null
        if (!isValidURL(value)) return t('validation.link.invalidUrl')
        if (value?.length > 250) return t('validation.link.maxLength', { count: 250 })
      },
      content: (value) => (value && value.length > 400 ? t('validation.content.maxLength', { count: 400 }) : null),
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
        setCalloutErrors([t('post.edit.failedToUpdate')])
        return
      }

      onSuccess(res.data.updatePostWithCategories.post)
      onClose()
      showNotification({
        id: 'post-updated',
        title: t('notifications.postUpdatedTitle'),
        message: t('notifications.postUpdatedMessage'),
        color: 'green',
        icon: <IconSend size={18} />,
        autoClose: 5000,
      })
    } catch (error) {
      console.error('Post update error:', error)
      setCalloutErrors([error instanceof Error ? error.message : t('post.edit.failedToUpdate')])
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
      title={t('post.edit.modalTitle')}
      closeOnEscape={false}
      closeOnClickOutside
    >
      <ErrorCallout title={t('common.errorUpdatingPost')} errors={calloutErrors} />
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
              <Input.Wrapper
                label={t('post.fields.title')}
                withAsterisk
                error={editPostForm.errors.title}
                size="sm"
                mb="md"
              >
                <EmoteInput
                  placeholder={t('post.create.titlePlaceholder')}
                  data-autofocus
                  {...editPostForm.getInputProps('title')}
                  error={!!editPostForm.errors.title}
                  size="sm"
                />
              </Input.Wrapper>
              <Text size="xs" c="dimmed" mt={-10} mb="md">
                {t('post.create.helpText')}
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
              <Tooltip label={t('post.create.unrecognizedServiceWarning')}>
                <IconAlertTriangle size={16} color="var(--mantine-color-orange-5)" />
              </Tooltip>
            ) : (
              <IconCircleCheck size={16} color="var(--mantine-color-green-6)" />
            )
          }
          label={t('post.fields.link')}
          {...editPostForm.getInputProps('link')}
        />
        {unknownLinkService && (
          <Text size="xs" opacity={0.6} c="var(--mantine-color-orange-5)">
            {t('post.create.unrecognizedServiceWarning')}
          </Text>
        )}

        <TextInput label={t('post.fields.content')} {...editPostForm.getInputProps('content')} />
        <Text size="xs" opacity={0.6}>
          {t('post.create.contentHelpText')}
        </Text>

        <CategoriesSelect
          {...editPostForm.getInputProps('categories')}
          selectedCategories={editPostForm.values.categories || []}
          onCategoriesChange={(categories) => editPostForm.setFieldValue('categories', categories)}
          allowedCategories={keys(PostCategoryNamesOnCreate)}
        />
        <Space h="md" />

        <FileInput
          label={t('post.edit.videoReplaceHelpText')}
          placeholder={t('post.create.videoUploadHelpText')}
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
          {t('post.edit.videoReplaceHelpText')}
        </Text>

        <Group justify="end" mt="md">
          <Button
            variant="gradient"
            gradient={{ from: '#1864ab', to: '#326798', deg: 225 }}
            type="submit"
            loading={updatePostMutation.fetching}
          >
            {t('common.update')}
          </Button>
        </Group>
      </form>
    </Modal>
  )
}
