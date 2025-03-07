import { Badge } from '@mantine/core'
import { capitalize } from 'lodash'
import { memo } from 'react'
import { UserRole } from 'src/graphql/gen'
import { getContrastYIQ, ROLE_COLORS } from 'src/utils/colors'

const RoleBadge = memo(function ({ role }: { role: UserRole }) {
  const color = ROLE_COLORS[role]

  return (
    <Badge
      size="sm"
      radius="md"
      style={{
        backgroundColor: color,
        color: getContrastYIQ(color) === 'black' ? 'whitesmoke' : '#131313',
        textTransform: 'capitalize',
      }}
    >
      {role}
    </Badge>
  )
})

export default RoleBadge
