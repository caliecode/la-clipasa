import { Avatar, Group, Space } from '@mantine/core'
import RoleBadge from 'src/components/Badges/RoleBadge'
import { UsersQuery } from 'src/graphql/gen'
import { nameInitials } from 'src/utils/strings'
import { withBaseURL } from 'src/utils/urls'

interface UserComboboxOptionProps {
  user: NonNullable<NonNullable<UsersQuery['users']['edges']>[0]>['node']
}

export default function UserComboboxOption({ user }: UserComboboxOptionProps) {
  if (!user) return null

  return (
    <Group align="center" p={5}>
      <div style={{ display: 'flex', alignItems: 'center', maxHeight: 1 }}>
        <Avatar
          size={28}
          radius="xl"
          data-test-id="header-profile-avatar"
          alt={user.displayName}
          src={withBaseURL(user.profileImage)}
        >
          {nameInitials(user?.displayName || '')}
        </Avatar>
        <Space p={5} />
        <RoleBadge role={user.role} />
        <Space p={5} />
        <div style={{ marginLeft: 'auto' }}>{user.displayName}</div>
      </div>
    </Group>
  )
}
