// posts/components/Post.Skeleton.tsx
import { Skeleton, Flex, Space } from '@mantine/core'
import styles from '../Post.module.css'

export const PostSkeleton = () => (
  <Flex direction="column" justify="center" p={15} className={styles.skeletonCard}>
    <Flex direction="row" align="center">
      <Skeleton height={40} circle />
      <Space ml={10} />
      <Skeleton height={12} width="20%" radius="sm" />
    </Flex>
    <Space mb={20} />
    <Skeleton height={12} mt={6} width="100%" radius="sm" mb="xs" />
    <Space mb={20} />
    <Skeleton height={12} mt={6} width="100%" radius="sm" mb="xs" />
    <Space mb={20} />
    <Skeleton height={12} mt={6} width="100%" radius="sm" mb="xs" />
  </Flex>
)
