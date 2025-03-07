// posts/components/Post.Skeleton.tsx
import { Skeleton, Flex, Space } from '@mantine/core'
import styles from '../Post.module.css'

export const PostSkeleton = () => (
  <Flex direction="column" justify="center" p={15} className={styles.skeletonCard}>
    <Skeleton height={8} mt={6} width="90%" radius="xl" mb="xs" />
    <Skeleton height={8} mt={6} width="90%" radius="xl" mb="xs" />
    <Skeleton height={8} mt={6} width="70%" radius="xl" mb="xs" />
    <Space mb={10} />
    <Flex direction="row" align="center">
      <Skeleton height={40} circle />
      <Space ml={10} />
      <Skeleton height={8} width="20%" radius="xl" />
    </Flex>
    <Space mb={20} />
    <Skeleton height={8} mt={6} width="70%" radius="xl" mb="xs" />
  </Flex>
)
