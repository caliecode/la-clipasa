import {
  Box,
  CheckIcon,
  Combobox,
  Group,
  InputBaseProps,
  Pill,
  PillsInput,
  ScrollArea,
  useCombobox,
} from '@mantine/core'
import { pluralize } from 'inflection'
import _, { isArray, upperFirst, lowerFirst } from 'lodash'
import { useState, useEffect } from 'react'
import { ChangeHandler, useForm, useFormContext, useFormState } from 'react-hook-form'
import { Virtuoso } from 'react-virtuoso'
import UserComboboxOption from 'src/components/Combobox/UserComboboxOption'
import CustomPill from 'src/components/CustomPill/CustomPill'
import { useUsersQuery } from 'src/graphql/gen'
import { useFormSlice } from 'src/slices/form'
import { PathType } from 'src/types/utils'
import { FormField } from 'src/utils/form'
import { renderWarningIcon, Warnings } from 'src/utils/formGeneration'
import { selectOptionsBuilder } from 'src/utils/formGeneration.context'

type CustomMultiSelectProps<T> = {
  formField: string
  formName: string
  registerOnChange: ChangeHandler
  selectOptions: ReturnType<typeof selectOptionsBuilder<T, unknown>>
  itemName: string
} & InputBaseProps

export default function CustomMultiSelect<T>({
  formName,
  formField,
  registerOnChange,
  selectOptions,
  itemName,
  ...inputProps
}: CustomMultiSelectProps<T>) {
  const form = useFormContext()

  const formValues = (form.getValues(formField) as any[]) || []

  const [search, setSearch] = useState('')

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex('active'),
  })

  const handleValueRemove = async (val: string) => {
    // index position changed, misleading message. must manually trigger validation for the field via trigger
    formSlice.setCustomError(formName, formField, null)
    form.unregister(formField) // needs to be called before setValue
    form.setValue(
      formField,
      formValues.filter((v) => v !== val),
    )
    await form.trigger(formField, { shouldFocus: true })
  }

  const comboboxOptions = selectOptions.values
    .filter((item: any) => {
      const inSearch = JSON.stringify(
        selectOptions.searchValueTransformer ? selectOptions.searchValueTransformer(item) : item,
      )
        .toLowerCase()
        .includes(search.toLowerCase().trim())

      return inSearch
    })
    .map((option) => {
      const formValue = selectOptions.formValueTransformer(option)
      const selected = formValues.includes(selectOptions.formValueTransformer(option))

      return (
        <Combobox.Option
          value={String(formValue)}
          key={String(formValue)}
          active={selected}
          aria-selected={selected}
          aria-label={
            selectOptions.ariaLabelTransformer ? selectOptions.ariaLabelTransformer(option) : String(formValue)
          }
        >
          <Group align="center" justify="start">
            {selected && <CheckIcon size={12} />}
            {selectOptions.optionTransformer(option)}
          </Group>
        </Combobox.Option>
      )
    })

  const formState = useFormState({ control: form.control })

  const formSlice = useFormSlice()
  const multiselectFirstError = formSlice.form[formName]?.customErrors[formField]

  useEffect(() => {
    const formFieldErrors = _.get(formState.errors, formField)
    if (isArray(formFieldErrors) && !multiselectFirstError) {
      formFieldErrors.forEach((error, index) => {
        if (!!error) {
          const message = `${itemName} number ${index + 1} ${error.message}`
          formSlice.setCustomError(formName, formField, message)
        }
      })
    }
  }, [formState])

  const { rightSection, ...props } = inputProps

  const [warnings, setWarnings] = useState<Warnings>({})

  useEffect(() => {
    const msg = Object.values(warnings).join(',')
    if (formSlice.form[formName]?.customWarnings[formField] !== msg) {
      formSlice.setCustomWarning(formName, formField, msg)
    }
  }, [warnings])

  return (
    <Box w={'100%'}>
      <Combobox
        store={combobox}
        onOptionSubmit={(value, props) => {
          const option = selectOptions.values.find(
            (option) => String(selectOptions.formValueTransformer(option)) === value,
          )
          const selected = formValues.includes(selectOptions.formValueTransformer(option))
          if (selected) {
            handleValueRemove(selectOptions.formValueTransformer(option))
            return
          }
          formSlice.setCustomError(formName, formField, null)
          registerOnChange({
            target: {
              name: formField,
              value: [...formValues, selectOptions.formValueTransformer(option)],
            },
          })
        }}
        withinPortal
      >
        <Combobox.DropdownTarget>
          <PillsInput
            styles={{
              error: {},
            }}
            label={pluralize(upperFirst(itemName))}
            onClick={() => combobox.openDropdown()}
            {...props}
            // must override input props error
            error={multiselectFirstError}
            rightSection={renderWarningIcon(Object.values(warnings))}
          >
            <Pill.Group>
              {formValues.length > 0 &&
                formValues.map((formValue, i) => (
                  <CustomPill
                    index={i}
                    formName={formName}
                    itemName={itemName}
                    selectOptions={selectOptions}
                    formField={formField as FormField}
                    key={`${formName}-${formField}-${i}-pill`}
                    value={formValue}
                    handleValueRemove={handleValueRemove}
                    warnings={warnings}
                    setWarnings={setWarnings}
                  />
                ))}

              <Combobox.EventsTarget>
                <PillsInput.Field
                  placeholder={`Search ${pluralize(lowerFirst(itemName))}`}
                  onChange={async (event) => {
                    combobox.updateSelectedOptionIndex()
                    setSearch(event.currentTarget.value)
                  }}
                  data-testid={`${formName}-search--${formField}`}
                  value={search}
                  onFocus={() => combobox.openDropdown()}
                  onBlur={() => combobox.closeDropdown()}
                  onKeyDown={async (event) => {
                    if (event.key === 'Backspace' && search.length === 0) {
                      event.preventDefault()
                      formSlice.setCustomError(formName, formField, null)
                      form.unregister(formField) // needs to be called before setValue
                      form.setValue(formField, formValues)
                    }
                  }}
                />
              </Combobox.EventsTarget>
            </Pill.Group>
          </PillsInput>
        </Combobox.DropdownTarget>

        <Combobox.Dropdown>
          <Combobox.Options
            mah={200} // scrollable
            style={{ overflowY: 'auto' }}
          >
            <ScrollArea.Autosize mah={200} type="scroll">
              <Virtuoso
                style={{ height: '200px' }} // match height with autosize
                totalCount={comboboxOptions.length}
                itemContent={(index) => comboboxOptions[index]}
              />
            </ScrollArea.Autosize>
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    </Box>
  )
}

function Demo() {
  const [users, refetchUsers] = useUsersQuery()

  const userIdSelectOption = selectOptionsBuilder({
    type: 'select',
    values: users.data?.users.edges ?? [],
    //  TODO: transformers can be reusable between forms. could simply become
    //  {
    //   type: "select"
    //   values: ...
    //   ...userIdFormTransformers
    // }
    optionTransformer(el) {
      return <UserComboboxOption user={el} />
    },
    formValueTransformer(el) {
      return el?.node?.id
    },
    pillTransformer(el) {
      return <>{el?.node?.displayName}</>
    },
    searchValueTransformer(el) {
      return `${el?.node?.displayName} ${el?.node?.alias}`
    },
  })

  const form = useForm<CreateWorkItemTagRequest>({
    resolver: ajvResolver(schema as any, {
      strict: false,
      formats: fullFormats,
    }),
    mode: 'all',
    reValidateMode: 'onChange',
  })
  const { register, handleSubmit, control, formState } = form

  const { onChange: registerOnChange, ...registerProps } = form.register(formField, {

  return (
    <CustomMultiSelect
      formName="demo"
      formField="teamIds"
      itemName="team"
      selectOptions={userIdSelectOption}
      registerOnChange={}
    />
  )
}
