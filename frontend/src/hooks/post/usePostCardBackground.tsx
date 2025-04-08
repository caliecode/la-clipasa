import { useMantineColorScheme } from '@mantine/core'
import { PostContextType } from 'src/components/Post/Post.context'
import { uniqueCategoryBackground } from 'src/services/categories'

export const useCardBackground = (post?: PostContextType['post']) => {
  const { colorScheme } = useMantineColorScheme()

  const uniqueCategory = post?.categories?.find((c) => uniqueCategoryBackground[c.category])
  const cardBackground = uniqueCategory ? uniqueCategoryBackground[uniqueCategory.category] : undefined

  return {
    image: cardBackground?.image,
    color: cardBackground
      ? cardBackground.color(colorScheme)
      : colorScheme === 'dark'
        ? 'var(--mantine-color-gray-9)'
        : 'var(--mantine-color-gray-2)',
  }
}
