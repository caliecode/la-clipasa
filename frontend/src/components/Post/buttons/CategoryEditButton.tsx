import { useState } from 'react'
import {
  ActionIcon,
  Box,
  Button,
  Combobox,
  Pill,
  PillsInput,
  Stack,
  Text,
  Textarea,
  Tooltip,
  useCombobox,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconCheck, IconPlus } from '@tabler/icons-react'
import { useContext } from 'react'
import {
  categoryEmojis,
  EMOJI_SIZE,
  emojiInversion,
  PostCategoryNames,
  uniqueCategories,
} from 'src/services/categories'
import ErrorCallout from 'src/components/Callout/ErrorCallout'
import ProtectedComponent from 'src/components/Permissions/ProtectedComponent'
import { usePostContext } from 'src/components/Post/Post.context'
import { joinWithAnd } from 'src/utils/format'
import { useMantineColorScheme } from '@mantine/core'
import {
  PostCategoryCategory,
  useCreatePostCategoryMutation,
  useDeletePostCategoryMutation,
  useUpdatePostMutation,
} from 'src/graphql/gen'
import { getMatchingKeys } from 'src/utils/object'
import styles from './buttons.module.css'
import { useCalloutErrors } from 'src/components/Callout/useCalloutErrors'
import useAuthenticatedUser from 'src/hooks/auth/useAuthenticatedUser'
import { extractGqlErrors } from 'src/utils/errors'

const categoriesData = Object.entries(PostCategoryNames).map(([k, v]) => ({
  label: v,
  value: k as PostCategoryCategory,
}))

function CategoryPill({ value, onRemove }: { value: string; onRemove: () => void }) {
  const { colorScheme } = useMantineColorScheme()

  return (
    <Pill withRemoveButton onClick={onRemove}>
      <Box style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {categoryEmojis[value] && (
          <img
            style={{
              filter: emojiInversion[value] && colorScheme === 'dark' ? 'invert(100%)' : undefined,
            }}
            src={categoryEmojis[value]}
            height={EMOJI_SIZE}
            width={EMOJI_SIZE}
            alt=""
          />
        )}
        <Text size="sm">{categoriesData.find((item) => item.value === value)?.label}</Text>
      </Box>
    </Pill>
  )
}

export default function CategoryEditButton() {
  const user = useAuthenticatedUser()
  const { post, setPost } = usePostContext()

  const [categoriesEditPopoverOpened, setCategoriesEditPopoverOpened] = useState(false)
  const { colorScheme } = useMantineColorScheme()
  const [, updatePost] = useUpdatePostMutation()
  const [, createPostCategory] = useCreatePostCategoryMutation()
  const [, deletePostCategory] = useDeletePostCategoryMutation()

  const [errors, setErrors] = useState<string[]>([])
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex('active'),
  })

  const postPatchForm = useForm({
    initialValues: {
      categories: (post.categories || []).map((c) => c.category),
      moderationComment: post.moderationComment,
    },
    validate: {
      categories: (categories) => {
        const formUniqueCategories = getMatchingKeys(categories, uniqueCategories)
        if (formUniqueCategories.length > 1) {
          return `Cannot have a post with ${joinWithAnd(formUniqueCategories)} at the same time`
        }
      },
    },
  })

  const handleCategoryToggle = async (val: PostCategoryCategory) => {
    // if val selected, remove it, otherwise add it
    if (post.categories?.map((c) => c.category).includes(val)) {
      return handleCategoryRemove(val)
    }

    const r = await createPostCategory({
      input: {
        postID: post.id,
        category: val,
      },
    })

    if (r.error) {
      setErrors(extractGqlErrors(r.error.graphQLErrors))
      return
    }
    setErrors([])

    const postCategory = r.data?.createPostCategory.postCategory
    if (postCategory?.category) {
      setPost({
        ...post,
        categories: [...(post.categories || []), postCategory],
      })
    }
  }

  const handleCategoryRemove = async (val: string) => {
    const r = await deletePostCategory({
      id: post.categories?.find((c) => c.category === val)?.id || '',
    })

    if (r.error) {
      setErrors(extractGqlErrors(r.error.graphQLErrors))
      return
    }
    setErrors([])

    const deletedID = r.data?.deletePostCategory.deletedID
    if (deletedID) {
      setPost({
        ...post,
        categories: post.categories?.filter((c) => c.id !== deletedID),
      })
    }
  }

  const values = post.categories?.map(({ category }) => (
    <CategoryPill key={category} value={category} onRemove={() => handleCategoryRemove(category)} />
  ))

  const options = categoriesData.map((item) => {
    const isSelected = post.categories?.map((c) => c.category)?.includes(item.value)

    return (
      <Combobox.Option value={item.value} key={item.value} active={isSelected}>
        <Box style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isSelected && <IconCheck size={16} stroke={2.5} />}
          {categoryEmojis[item.value] && (
            <img
              style={{
                filter: emojiInversion[item.value] && colorScheme === 'dark' ? 'invert(100%)' : undefined,
              }}
              src={categoryEmojis[item.value]}
              height={EMOJI_SIZE}
              width={EMOJI_SIZE}
              alt=""
            />
          )}
          <Text>{item.label}</Text>
        </Box>
      </Combobox.Option>
    )
  })

  return (
    <ProtectedComponent requiredRole="MODERATOR">
      <Tooltip
        className={styles.categoryEditTooltip}
        opened={categoriesEditPopoverOpened}
        onClick={(e) => {
          e.stopPropagation()
        }}
        w={400}
        withArrow
        position="bottom"
        label={
          <>
            <ErrorCallout title="Error updating post" errors={errors} />
            <form
              onSubmit={postPatchForm.onSubmit(async () => {
                console.log('form submitted')
                await updatePost({
                  id: post.id,
                  input: {
                    moderationComment: postPatchForm.values.moderationComment,
                  },
                })
              })}
              onClick={(e) => {
                e.stopPropagation()
              }}
            >
              <Stack gap="md" p="xs" className={styles.categoryEdit}>
                <Combobox store={combobox} withinPortal={false} onOptionSubmit={handleCategoryToggle}>
                  <Combobox.DropdownTarget>
                    <PillsInput
                      pointer
                      onClick={(e) => {
                        e.stopPropagation()
                        combobox.toggleDropdown()
                      }}
                    >
                      <Pill.Group>
                        {(values || []).length > 0 ? values : <PillsInput.Field placeholder="Pick categories" />}
                      </Pill.Group>
                    </PillsInput>
                  </Combobox.DropdownTarget>

                  <Combobox.Dropdown>
                    <Combobox.Options>{options}</Combobox.Options>
                  </Combobox.Dropdown>
                </Combobox>

                {/* {!post.isModerated && (
                  <Box>
                    <Textarea
                      {...postPatchForm.getInputProps('moderationComment')}
                      autosize
                      minRows={2}
                      label="Moderation comment"
                    />
                    <Text size="xs" c="dimmed">
                      Leave a message to the post author.
                    </Text>
                  </Box>
                )}
                <Button
                  type="submit"
                  onClick={(e) => e.stopPropagation()}
                  leftSection={<IconCheck size={16} stroke={1.5} />}
                  color="blue"
                >
                  Save
                </Button> */}
              </Stack>
            </form>
          </>
        }
      >
        <ActionIcon
          radius="xl"
          size={22}
          onClick={(e) => {
            e.stopPropagation()
            setCategoriesEditPopoverOpened(!categoriesEditPopoverOpened)
          }}
        >
          <IconPlus
            color={colorScheme === 'light' ? 'var(--mantine-color-dark-6)' : 'var(--mantine-color-gray-1)'}
            size={12}
            stroke={2.5}
          />
        </ActionIcon>
      </Tooltip>
    </ProtectedComponent>
  )
}
