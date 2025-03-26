import { Skeleton, Flex, Space, Group } from '@mantine/core'
import styles from '../Post.module.css'

export const PostSkeleton = ({ ...props }) => (
  <Flex {...props} direction="column" justify="center" p={20} className={styles.skeletonCard}>
    <Flex direction="row" align="center" justify="flex-start">
      <Skeleton height={30} circle />
      <Space ml={10} />
      <Flex direction="column" align="flex-start" gap={4}>
        <Skeleton height={10} width="80" radius="sm" />
        <Skeleton height={6} width="40" radius="sm" />
      </Flex>
      <Space ml="30" />
      <Skeleton height={18} width="60" radius="xl" />
    </Flex>
    <Space mb={20} />
    <Skeleton height={12} mt={6} width="30%" radius="sm" mb="xs" />
    <Space mb={20} />
    <Flex direction="row" justify="center">
      <Skeleton height={18} mt={6} width="40%" radius="sm" mb="xs" />
    </Flex>
    <Skeleton height={24} mt={6} width="20%" radius="sm" mb="xs" />
  </Flex>
)
