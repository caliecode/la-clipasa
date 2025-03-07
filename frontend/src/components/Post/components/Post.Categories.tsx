import CategoryBadge from 'src/components/CategoryBadge'
import CategoryEditButton from 'src/components/Post/buttons/CategoryEditButton'
import styles from '../Post.module.css'
import { Group } from '@mantine/core'
import { usePostContext } from 'src/components/Post/Post.context'

export function PostCategories() {
  const { post } = usePostContext()

  return (
    <Group align="left">
      <CategoryEditButton />
      {post.categories?.map((category, i) => (
        <CategoryBadge className={`disable-select ${styles.category}`} key={i} category={category.category} />
      ))}
    </Group>
  )
}
