import { pluralize } from 'inflection'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const DELETED_ENTITY_FILTER_STATES = [null, true, false]

export const useDeletedEntityFilter = (entity: string) => {
  const { t } = useTranslation()
  const [deletedEntityFilter, setDeletedEntityFilter] = useState(0)

  const toggleDeletedUsersFilter = () => {
    const newStatus = (deletedEntityFilter + 1) % DELETED_ENTITY_FILTER_STATES.length
    setDeletedEntityFilter(newStatus)
  }

  const getLabelText = () => {
    switch (DELETED_ENTITY_FILTER_STATES[deletedEntityFilter]) {
      case null:
        return t('common.filters.showingAll', { entity: pluralize(entity) })
      case true:
        return t('common.filters.showingDeletedOnly', { entity: pluralize(entity) })
      case false:
        return t('common.filters.hidingDeleted', { entity: pluralize(entity) })
      default:
        return ''
    }
  }

  return {
    getLabelText,
    toggleDeletedUsersFilter,
    deletedEntityFilterState: DELETED_ENTITY_FILTER_STATES[deletedEntityFilter],
  }
}
