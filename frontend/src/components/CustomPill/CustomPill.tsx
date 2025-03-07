import { Box, CloseButton } from '@mantine/core'
import { singularize } from 'inflection'
import { PathType } from 'src/types/utils'
import { getContrastYIQ } from 'src/utils/colors'
import { Warnings } from 'src/utils/formGeneration'
import { selectOptionsBuilder } from 'src/utils/formGeneration.context'
import { T } from 'vitest/dist/reporters-LqC_WI4d'

import cx from 'clsx'
import classes from './form.module.css'

type CustomPillProps = {
  formName: string
  itemName: string
  value: any
  index: number
  formField: string
  handleValueRemove: (val: string) => void
  props?: React.HTMLProps<HTMLDivElement>

  selectOptions: ReturnType<
    typeof selectOptionsBuilder<
      PathType<
        T,
        //@ts-ignore
        key
      >,
      unknown
    >
  >
  warnings: Warnings
  setWarnings: React.Dispatch<React.SetStateAction<Warnings>>
}

export default function CustomPill({
  itemName,
  formName,
  value,
  handleValueRemove,
  selectOptions,
  formField,
  warnings,
  setWarnings,
  index,
  ...props
}: CustomPillProps): JSX.Element | null {
  // const formSlice = useFormSlice()
  // const warning = formSlice.form[formName]?.customWarnings[formField]

  let invalidValue = null

  const option = selectOptions.values.find((option) => selectOptions.formValueTransformer(option) === value)
  if (!option) {
    // for multiselects, explicitly set wrong values so that error positions make sense and the user knows there is a wrong form value beforehand
    // instead of us deleting it implicitly
    // TODO: should have multiselect and select option to allow creating values on the fly.
    // if no option found in search, a button option to `Create ${itemName}` shows a modal
    // with the form that creates that entity, e.g. tag, and once created we refetch selectOptions.values
    // see https://mantine.dev/combobox/?e=SelectCreatable
    invalidValue = value
    if (invalidValue !== null && invalidValue !== undefined) {
      if (!warnings[index]) {
        setWarnings((v) => ({ ...v, [index]: `${itemName} "${value}" does not exist` }))
      }
    }
  }

  let color = '#bbbbbb'
  if (selectOptions?.labelColor && !invalidValue) {
    color = selectOptions?.labelColor(option)
  }

  const transformer = selectOptions.pillTransformer ? selectOptions.pillTransformer : selectOptions.optionTransformer

  return (
    <Box
      className={cx(classes.valueComponentOuterBox, classes.container)}
      style={{
        '--bg-color': color,
        '--text-color': getContrastYIQ(color) === 'black' ? 'whitesmoke' : '#131313',
      }}
      {...props}
    >
      <Box className={classes.valueComponentInnerBox}>{invalidValue || transformer(option)}</Box>
      <CloseButton
        onMouseDown={() => {
          if (invalidValue !== null) {
            setWarnings({})
            // formSlice.setCustomWarning(formName, formField, null)
          }
          handleValueRemove(value)
        }}
        variant="transparent"
        size={22}
        iconSize={14}
        tabIndex={-1}
        data-testid={`${formName}-${formField}-remove--${value}`}
        aria-label={`Remove ${itemName} ${value}`}
      />
    </Box>
  )
}
