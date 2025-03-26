import { Skeleton, Flex, Space, Group } from '@mantine/core'
import styles from './PostFilters.module.css'

export const PostFiltersSkeleton = ({ ...props }) => (
  <Flex {...props} direction="column" justify="flex-start" h="50vh" p={20} className={styles.skeletonFilter}>
    <Skeleton height={32} mt={6} width="100%" radius="sm" mb={20} />
    <Flex direction="row" justify="center" gap={10}>
      <Skeleton height={32} mt={6} width="50%" radius="sm" mb={10} />
      <Skeleton height={32} mt={6} width="50%" radius="sm" mb={20} />
    </Flex>
    <Skeleton height={32} mt={6} width="100%" radius="sm" mb={20} />
    <Skeleton height={32} mt={6} width="100%" radius="sm" mb={20} />
    <Skeleton height={32} mt={6} width="100%" radius="sm" mb={20} />
    <Skeleton height={32} mt={6} width="100%" radius="sm" mb={20} />
    <Skeleton height={12} mt={6} width="15%" radius="sm" mb={20} />
    <Flex direction="row" justify="flex-start" gap={10} mb={20}>
      <Skeleton height={18} width="60" radius="xl" />
      <Skeleton height={18} width="70" radius="xl" />
      <Skeleton height={18} width="40" radius="xl" />
      <Skeleton height={18} width="60" radius="xl" />
    </Flex>
    <Skeleton height={12} mt={6} width="20%" radius="sm" mb={20} />
    <Flex direction="row" justify="flex-start" gap={10} wrap={'wrap'}>
      <Skeleton height={18} width="80" radius="xl" />
      <Skeleton height={18} width="70" radius="xl" />
      <Skeleton height={18} width="90" radius="xl" />
      <Skeleton height={18} width="70" radius="xl" />
      <Skeleton height={18} width="60" radius="xl" />
      <Skeleton height={18} width="100" radius="xl" />
      <Skeleton height={18} width="90" radius="xl" />
      <Skeleton height={18} width="60" radius="xl" />
    </Flex>
  </Flex>
)
