import { Badge, Image, MantineGradient, useMantineTheme } from '@mantine/core'
import spiderWeb from 'src/assets/img/icon-spider-web.svg'
import ear from 'src/assets/img/icon-ear.svg'
import type { HTMLProps } from 'react'
import React from 'react'
import { PostCategoryCategory } from 'src/graphql/gen'
import {
  categoryColorGradient,
  categoryDoubleEmojis,
  categoryPreEmojis,
  PostCategoryNames,
  categoryPostEmojis,
  emojiInversion,
  EMOJI_SIZE,
} from 'src/services/categories'
import styles from './CategoryBadge.module.css' // Import CSS Module

interface CategoryBadgeProps extends HTMLProps<HTMLElement> {
  category: PostCategoryCategory
  asButton?: boolean
}

function CategoryBadge(props: CategoryBadgeProps) {
  const { category, asButton, ...htmlProps } = props
  const theme = useMantineTheme()

  const categoryName = PostCategoryNames[category] ?? category

  return (
    <Badge
      variant="gradient"
      component={asButton ? 'button' : 'div'}
      gradient={categoryColorGradient[category] ?? null}
      className={styles.badge} // Use CSS Module class
      aria-label={`Filter by ${categoryName}`}
      {...(htmlProps as any)}
    >
      <div className={styles.content}>
        {renderEmoji(categoryDoubleEmojis)}
        {renderEmoji(categoryPreEmojis)}
        <div>{categoryName}</div>
        {renderEmoji(categoryPostEmojis)}
        {renderEmoji(categoryDoubleEmojis)}
      </div>
    </Badge>
  )

  function renderEmoji(emojis): React.ReactNode {
    return (
      emojis[category] && (
        <Image
          className={styles.emoji}
          style={{
            '--emoji-filter': emojiInversion[category] ? 'invert(100%)' : 'none', // Dynamic CSS variable
          }}
          src={emojis[category]}
          height={EMOJI_SIZE}
          width={EMOJI_SIZE}
        />
      )
    )
  }
}

export default React.memo(CategoryBadge)
