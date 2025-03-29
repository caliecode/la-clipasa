import { useEffect, useRef, useState } from 'react'
import { ActionIcon, Popover, Tooltip } from '@mantine/core'
import { useClickOutside } from '@mantine/hooks'
import { IconPlus } from '@tabler/icons-react'
import ProtectedComponent from 'src/components/Permissions/ProtectedComponent'
import { usePostContext } from 'src/components/Post/Post.context'
import ErrorCallout from 'src/components/Callout/ErrorCallout'
import { useMantineColorScheme } from '@mantine/core'
import { PostCategoryCategory, useCreatePostCategoryMutation, useDeletePostCategoryMutation } from 'src/graphql/gen'
import { extractGqlErrors } from 'src/utils/errors'
import useAuthenticatedUser from 'src/hooks/auth/useAuthenticatedUser'
import styles from './buttons.module.css'
import { CategoriesSelect } from 'src/components/CategorySelect'
import { PostCategoryNames } from 'src/services/categories'
import { keys } from 'src/utils/object'

export default function CategoryEditButton() {
  const user = useAuthenticatedUser()
  const { post, setPost } = usePostContext()
  const { colorScheme } = useMantineColorScheme()
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
      if (errors.length === 0) errors.push(r.error.message)
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
      if (errors.length === 0) errors.push(r.error.message)
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

  const [errorNotifier, setErrorNotifier] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // useClickOutside(() => setPopoverOpened(false), ['mouseup', 'touchend'], [containerRef.current, dropdownRef.current])

  useEffect(() => {
    errors.length > 0 && setErrorNotifier((prev) => prev + 1)
  }, [errors])

  return (
    <ProtectedComponent requiredRole="MODERATOR">
      <div ref={containerRef}>
        <Popover
          withinPortal
          opened={popoverOpened}
          onChange={(opened) => {
            setPopoverOpened(opened)
            if (opened) setErrors([])
          }}
          position="bottom"
          withArrow
          width={400}
          trapFocus
          closeOnClickOutside
        >
          <Popover.Target ref={containerRef}>
            <Tooltip label={'Edit categories'}>
              <ActionIcon
                radius="xl"
                size={22}
                onClick={(e) => {
                  e.stopPropagation()
                  setPopoverOpened((o) => !o)
                }}
              >
                <IconPlus
                  color={colorScheme === 'light' ? 'var(--mantine-color-dark-6)' : 'var(--mantine-color-gray-1)'}
                  size={12}
                  stroke={2.5}
                />
              </ActionIcon>
            </Tooltip>
          </Popover.Target>

          <Popover.Dropdown ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
            <ErrorCallout title="Error updating post" errors={errors} />
            <CategoriesSelect
              selectedCategories={post.categories?.map((c) => c.category) || []}
              onCategoriesChange={handleCategoriesChange}
              allowedCategories={keys(PostCategoryNames)}
              errorOccurred={errorNotifier}
            />
          </Popover.Dropdown>
        </Popover>
      </div>
    </ProtectedComponent>
  )
}
