import { Button, Group, Modal, Popover, Text, Textarea, TextInput, Tooltip } from '@mantine/core'
import { useForm } from '@mantine/form'
import { showNotification } from '@mantine/notifications'
import { IconEyeCheck, IconSend } from '@tabler/icons'
import { useEffect, useRef, useState } from 'react'
import ErrorCallout from 'src/components/Callout/ErrorCallout'
import { CategoriesSelect } from 'src/components/CategorySelect'
import { CreatePostInput, CreatePostWithCategoriesInput, useCreatePostMutation } from 'src/graphql/gen'
import { PostCategoryNamesOnCreate } from 'src/services/categories'
import { emotesTextToHtml } from 'src/services/twitch'
import { useUISlice } from 'src/slices/ui'
import { extractGqlErrors } from 'src/utils/errors'
import { sanitizeContentEditableInputBeforeSubmit } from 'src/utils/strings'
import { isValidURL } from 'src/utils/urls'
import { keys } from 'src/utils/object'
import styles from './HomeSideActions.module.css'
import useAuthenticatedUser from 'src/hooks/auth/useAuthenticatedUser'

type CreatePostModalProps = {
  opened: boolean
  onClose: () => void
}

export default function CreatePostModal({ opened, onClose }: CreatePostModalProps): JSX.Element {
  const { user } = useAuthenticatedUser()
  const [createPostMutation, createPost] = useCreatePostMutation()
  const { setBurgerOpened } = useUISlice()
  const [titlePreviewPopoverOpened, setTitlePreviewPopoverOpened] = useState<boolean>(false)
  const [calloutErrors, setCalloutErrors] = useState<string[]>([])
  const titleInputRef = useRef<HTMLTextAreaElement>(null)
  const EMOJI_SIZE = 24

  const postCreateForm = useForm<CreatePostWithCategoriesInput>({
    initialValues: {
      base: {} as CreatePostInput,
      categories: [],
    },
    validate: {
      base: {
        title: (value) =>
          !value || value.trim() === '' || value.trim() === '<br>'
            ? 'Title cannot be empty'
            : value?.length > 150
              ? 'Title can have at most 150 characters.'
              : null,
        link: (value) =>
          !isValidURL(value)
            ? 'Link is not a valid URL'
            : value?.length > 250
              ? 'Link can have at most 250 characters.'
              : null,
        content: (value) => (value && value.length > 400 ? 'Message can have at most 400 characters.' : null),
      },
    },
  })

  useEffect(() => {
    user?.id && postCreateForm.setFieldValue('base.ownerID', user.id)
  }, [user])

  const handleSubmit = postCreateForm.onSubmit(async (values) => {
    values.base.title = sanitizeContentEditableInputBeforeSubmit(values.base.title)
    const res = await createPost({ input: values })

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
  })

  return (
    <Modal
      opened={opened}
      onClose={() => {
        onClose()
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
        <TextInput withAsterisk label="Link" {...postCreateForm.getInputProps('base.link')} />
        <TextInput label="Content" {...postCreateForm.getInputProps('base.content')} />
        <Text size="xs" opacity={0.6}>
          Leave message empty to show link by default.
        </Text>
        <CategoriesSelect
          {...postCreateForm.getInputProps('categories')}
          selectedCategories={postCreateForm.values.categories || []}
          onCategoriesChange={(categories) => postCreateForm.setFieldValue('categories', categories)}
          allowedCategories={keys(PostCategoryNamesOnCreate)}
        />
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
