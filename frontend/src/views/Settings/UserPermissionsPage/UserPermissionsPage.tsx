import _, { capitalize, concat, random, startCase, upperCase } from 'lodash'
import React, { Fragment, forwardRef, memo, useEffect, useReducer, useState } from 'react'
import { getContrastYIQ, ROLE_COLORS, scopeColor } from 'src/utils/colors'
import { joinWithAnd } from 'src/utils/format'

import PageTemplate from 'src/components/PageTemplate'
import { ToastId } from 'src/utils/toasts'
import { useUISlice } from 'src/slices/ui'
import type { ArrayElement, PathType, RecursiveKeyOf, RequiredKeys } from 'src/types/utils'
import {
  Avatar,
  Badge,
  Button,
  Flex,
  Space,
  Text,
  Title,
  Select,
  Group,
  Modal,
  Checkbox,
  Code,
  Card,
  Box,
  type DefaultMantineColor,
  Grid,
  Tooltip,
  Divider,
  type ComboboxItem,
  Combobox,
  useCombobox,
  InputBase,
  Input,
  ScrollArea,
} from '@mantine/core'
import { CodeHighlight } from '@mantine/code-highlight'
import { notifications } from '@mantine/notifications'
import { IconCheck, IconCircle, IconX } from '@tabler/icons'
import RoleBadge from 'src/components/Badges/RoleBadge'
import { entries, keys } from 'src/utils/object'
import useAuthenticatedUser from 'src/hooks/auth/useAuthenticatedUser'
import ErrorCallout from 'src/components/Callout/ErrorCallout'
import { AxiosApiError } from 'src/api/backend-mutator'
import { AxiosError } from 'axios'
import { checkAuthorization } from 'src/services/authorization'
import { asConst } from 'json-schema-to-ts'
import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form'
import { nameInitials, sentenceCase } from 'src/utils/strings'
import type { AppError, IUser } from 'src/types/ui'
import classes from './UserPermissionsPage.module.css'
import UserComboboxOption from 'src/components/Combobox/UserComboboxOption'
import { CalloutError, useFormSlice } from 'src/slices/form'
import { ROLES } from 'src/config'
import InfiniteLoader from 'src/components/Loading/InfiniteLoader'
import { useCalloutErrors } from 'src/components/Callout/useCalloutErrors'
import {
  UpdateUserAuthMutation,
  UpdateUserAuthMutationVariables,
  User,
  UserRole,
  UsersQuery,
  useUpdateUserAuthMutation,
  useUsersQuery,
} from 'src/graphql/gen'
import { extractGqlErrors } from 'src/utils/errors'
import { Virtuoso } from 'react-virtuoso'
import { useDebounce } from 'usehooks-ts'
import { UserCombobox } from 'src/components/UserCombobox'

interface SelectUserItemProps extends React.ComponentPropsWithoutRef<'div'> {
  user?: IUser | null
}

interface SelectRoleItemProps extends React.ComponentPropsWithoutRef<'div'> {
  label: string
  value: UserRole
}

const SelectRoleItem = ({ value }: SelectRoleItemProps) => {
  return (
    <Combobox.Option value={value}>
      <RoleBadge role={value} />
    </Combobox.Option>
  )
}

export default function UserPermissionsPage() {
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null)
  const [userOptions, setUserOptions] = useState<Array<SelectUserItemProps> | null>(null)
  const { user } = useAuthenticatedUser()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const [loadedUsers, refetchLoadedUsers] = useUsersQuery({
    variables: {
      first: 20,
      where: {
        ...(debouncedSearch && { displayNameContainsFold: debouncedSearch }),
      },
    },
  })

  useEffect(() => {
    refetchLoadedUsers()
  }, [debouncedSearch])

  const roleOptions = entries(ROLES)
    .filter(([role, v]) => checkAuthorization({ user, requiredRole: role }).authorized)
    .map(([role, v]) => ({
      label: upperCase(role),
      value: role,
    }))

  useEffect(() => {
    if (loadedUsers.data?.users.edges) {
      const newUserOptions = loadedUsers.data.users.edges.map((user) => ({
        label: user?.node?.displayName,
        value: user?.node?.displayName,
        user: user?.node,
      }))
      setUserOptions(newUserOptions)
    }
  }, [loadedUsers.data])

  const formName = 'user-permissions-form'

  const { extractCalloutErrors, setCalloutErrors, calloutErrors, extractCalloutTitle } = useCalloutErrors(formName)

  const [, updateUserAuth] = useUpdateUserAuthMutation()

  const form = useForm<UpdateUserAuthMutationVariables>({
    defaultValues: {},
  })

  const submitRoleUpdate = async () => {
    try {
      if (!selectedUser) return
      const payload = await updateUserAuth(form.getValues())
      if (payload.error) {
        notifications.show({
          id: ToastId.FormSubmit,
          title: 'Error',
          color: 'red',
          icon: <IconX size="1.2rem" />,
          autoClose: 15000,
          message: "Couldn't update user's role",
        })
        throw payload.error
      }
      notifications.show({
        id: ToastId.FormSubmit,
        title: 'Submitted',
        color: 'primary',
        icon: <IconCheck size="1.2rem" />,
        autoClose: 15000,
        message: 'Submitted',
      })
      setCalloutErrors([])
    } catch (error) {
      console.error(error)
      if (error.validationErrors) {
        setCalloutErrors(error.validationErrors)
        return
      }
      if (error.graphQLErrors) {
        setCalloutErrors(extractGqlErrors(error.graphQLErrors))
        return
      }
      setCalloutErrors([error])
    }
  }

  const handleError = (errors: typeof form.formState.errors) => {
    if (errors) {
      console.log('some errors found')
      console.log(errors)

      // TODO validate everything and show ALL validation errors
      // (we dont want to show very long error messages in each form
      // field, just that the field has an error,
      // so all validation errors are aggregated with full description in a callout)
      try {
        // TODO: validate form.getValues()
        setCalloutErrors([])
      } catch (error) {
        if (error.validationErrors) {
          setCalloutErrors(error.validationErrors)
          console.error(error)
          return
        }
        setCalloutErrors([error])
      }
    }
  }

  const onRoleSelectableChange = (role) => {
    console.log(role)
    form.setValue('role', role)
  }

  const onDisplayNameSelectableChange = (displayName) => {
    const user = loadedUsers.data?.users.edges?.find((user) => user?.node?.displayName === displayName)?.node
    if (!user) return
    console.log(user)
    setSelectedUser(user)
    form.setValue('id', user.id)
    form.setValue('role', user.role)
  }

  const [isModalVisible, setIsModalVisible] = useState(false)
  const closeModal = () => setIsModalVisible(false)
  const showModal = () => setIsModalVisible(true)

  const onRoleUpdateSubmit = async () => {
    showModal()
  }

  const registerProps = form.register('role')

  // useWatch({ name: 'role', control: form.control })

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption()
      combobox.focusTarget()
      setSearch('')
    },

    onDropdownOpen: () => {
      combobox.focusSearchInput()
    },
  })

  if (!user) return null

  const handleUserSelect = (user: User | null) => {
    setSelectedUser(user)
    if (user) {
      form.setValue('id', user.id)
      form.setValue('role', user.role)
    }
  }

  const element = (
    <FormProvider {...form}>
      {/* should show "detail" key, e.g. "User not found" insteadit gives Request failed with status code 404
      and its mistitled as Validation error */}
      <ErrorCallout title={extractCalloutTitle()} errors={concat(extractCalloutErrors())} />

      <Space pt={12} />
      <form onSubmit={form.handleSubmit(onRoleUpdateSubmit, handleError)}>
        <Flex direction="column">
          <UserCombobox
            onChange={handleUserSelect}
            value={selectedUser}
            label="Select user"
            placeholder="Search users"
          />
        </Flex>
        <Space pt={12} />
        {selectedUser?.displayName && (
          <>
            <Divider m={8} />
            <Select
              label="Update role"
              disabled={!checkAuthorization({ user, requiredRole: selectedUser.role }).authorized}
              // itemComponent={SelectRoleItem} // TODO: COMBOBOX
              data-test-subj="updateUserAuthForm__selectable_Role"
              defaultValue={selectedUser.role}
              data={roleOptions ?? []}
              {...registerProps}
              onChange={(value) => registerProps.onChange({ target: { name: 'role', value } })}
            />
            <Space pt={24} />
            <Button disabled={selectedUser === null} data-test-subj="updateUserAuthForm__submit" onClick={showModal}>
              Update authorization settings
            </Button>
          </>
        )}
      </form>
      <Modal
        opened={isModalVisible}
        title={
          <Text fw={'bold'} size={'md'}>
            Update auth information
          </Text>
        }
        onClose={closeModal}
        data-test-subj="updateUserAuthForm__confirmModal"
      >
        <>
          {`You're about to update auth information for `}
          <strong>{selectedUser?.displayName}</strong>.<p>Are you sure you want to do this?</p>
          <Group style={{ justifyContent: 'flex-end' }}>
            <Button variant="subtle" color="orange" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                await submitRoleUpdate()
                closeModal()
              }}
            >
              Update
            </Button>
          </Group>
        </>
      </Modal>
    </FormProvider>
  )

  return (
    <PageTemplate minWidth={600}>
      <Flex display="flex" direction="column">
        <Title>User permissions</Title>
        <Space />
        {element}
      </Flex>
    </PageTemplate>
  )
}

function FormData() {
  const form = useFormContext()

  form.watch()

  return <CodeHighlight language="json" code={JSON.stringify(form.getValues(), null, 4)}></CodeHighlight>
}
