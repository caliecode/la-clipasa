import { Card, Group, Text } from '@mantine/core'
import CategoryBadge from 'src/components/CategoryBadge'
import { PostCategoryNames } from 'src/services/categories'
import { usePostsSlice } from 'src/slices/posts'
import styles from './PostFilters.module.css'
import { PostCategoryCategory } from 'src/graphql/gen'

export default function CategoryFilters(): JSX.Element {
  const { queryParams, postActions } = usePostsSlice()

  function renderActiveCategoryFilters() {
    return queryParams.where?.hasCategoriesWith?.map(
      (c, i) =>
        c.or &&
        c.or.length > 0 &&
        c.or.map((cat, j) => {
          const category = cat.category!
          return (
            <CategoryBadge
              asButton
              className={`${styles.badgeHover} disable-select`}
              key={j}
              category={category}
              onClick={() => postActions.toggleCategory(category)}
            />
          )
        }),
    )
  }

  function renderCategoryFilters() {
    return Object.keys(PostCategoryNames)
      .filter(
        (c: PostCategoryCategory) =>
          !queryParams.where?.hasCategoriesWith
            ?.find((c) => c.or && c.or.length > 0)
            ?.or?.some((cat) => cat.category === c),
      )
      .map((category: PostCategoryCategory, i) => {
        return (
          <CategoryBadge
            asButton
            className={`${styles.badgeFilter} disable-select`}
            key={i}
            category={category}
            onClick={() => {
              postActions.toggleCategory(category)
            }}
          />
        )
      })
  }

  return (
    <>
      <Card.Section className={styles.section}>
        <Text mt="md" className={styles.label} c="dimmed">
          Active category filters
        </Text>
        <Group gap={7} mt={5}>
          {renderActiveCategoryFilters()}
        </Group>
      </Card.Section>
      <Card.Section className={styles.section}>
        <Text mt="md" className={styles.label} c="dimmed">
          Filter by category
        </Text>
        <Group gap={7} mt={5}>
          {renderCategoryFilters()}
        </Group>
      </Card.Section>
    </>
  )
}
