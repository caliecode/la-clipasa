import { useState } from 'react'
import { ActionIcon, Box, Button, Stack, Text, Textarea, Tooltip } from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconCheck, IconPlus } from '@tabler/icons-react'
import ProtectedComponent from 'src/components/Permissions/ProtectedComponent'
import { usePostContext } from 'src/components/Post/Post.context'
import ErrorCallout from 'src/components/Callout/ErrorCallout'
import { useMantineColorScheme } from '@mantine/core'
import {
  PostCategoryCategory,
  useCreatePostCategoryMutation,
  useDeletePostCategoryMutation,
  useUpdatePostMutation,
} from 'src/graphql/gen'
import { extractGqlErrors } from 'src/utils/errors'
import useAuthenticatedUser from 'src/hooks/auth/useAuthenticatedUser'
import styles from './buttons.module.css'
import { CategoriesSelect } from 'src/components/CategorySelect'
import { PostCategoryNames } from 'src/services/categories'
import { useClickOutside } from '@mantine/hooks'
import { keys } from 'src/utils/object'

export default function CategoryEditButton() {
  const user = useAuthenticatedUser()
  const { post, setPost } = usePostContext()
  const { colorScheme } = useMantineColorScheme()
  const [, updatePost] = useUpdatePostMutation()
  const [, createPostCategory] = useCreatePostCategoryMutation()
  const [, deletePostCategory] = useDeletePostCategoryMutation()

  const [errors, setErrors] = useState<string[]>([])
  const [popoverOpened, setPopoverOpened] = useState(false)

  const handleCategoryAdded = async (category: PostCategoryCategory) => {
    const r = await createPostCategory({
      input: { postID: post.id, category },
    })

    if (r.error) {
      setErrors(extractGqlErrors(r.error.graphQLErrors))
      // TODO:close categoery selection

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

  const handleCategoryRemoved = async (categoryId: string) => {
    const r = await deletePostCategory({ id: categoryId })

    if (r.error) {
      setErrors(extractGqlErrors(r.error.graphQLErrors))
      return
    }
    setErrors([])

    setPost({
      ...post,
      categories: post.categories?.filter((c) => c.id !== categoryId),
    })
  }

  const handleCategoriesChange = (newCategories: PostCategoryCategory[]) => {
    newCategories
      .filter((c) => !post.categories?.some((pc) => pc.category === c))
      .forEach((c) => handleCategoryAdded(c))

    post.categories?.filter((pc) => !newCategories.includes(pc.category)).forEach((pc) => handleCategoryRemoved(pc.id))
  }

  return (
    <ProtectedComponent requiredRole="MODERATOR">
      <Tooltip
        className={styles.categoryEditTooltip}
        opened={popoverOpened}
        onClick={(e) => e.stopPropagation()}
        w={400}
        withArrow
        position="bottom"
        label={
          <>
            <ErrorCallout title="Error updating post" errors={errors} />
            <CategoriesSelect
              selectedCategories={post.categories?.map((c) => c.category) || []}
              onCategoriesChange={handleCategoriesChange}
              allowedCategories={keys(PostCategoryNames)}
            />
          </>
        }
      >
        <ActionIcon
          radius="xl"
          size={22}
          onClick={(e) => {
            e.stopPropagation()
            setPopoverOpened(!popoverOpened)
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
