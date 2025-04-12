import {
  Title,
  Text,
  Button,
  Container,
  Group,
  useMantineTheme,
  useMantineColorScheme,
  Flex,
  Space,
  Card,
} from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import HttpStatus from 'src/utils/httpStatus'
import classes from './ErrorPage.module.css'
import { Authorization } from 'src/services/authorization'
import { useTranslation } from 'react-i18next'
import { sentenceCase } from 'src/utils/strings'
import { upperFirst } from 'lodash'
interface ErrorPageProps {
  status: number
  authResult?: Authorization
  text?: string
}

export function ErrorPage({ status, authResult, text }: ErrorPageProps) {
  const { colorScheme } = useMantineColorScheme()
  const navigate = useNavigate()

  let _text = 'An unknown error ocurred.'
  switch (status) {
    case HttpStatus.NOT_FOUND_404:
      _text = 'You may have mistyped the address, or the page has been moved to another URL.'
      break
    case HttpStatus.FORBIDDEN_403:
      _text = "You don't have the required permissions to access this content."
      break
    case HttpStatus.UNAUTHORIZED_401:
      _text = 'You need to log in before accessing this content.'
    default:
      break
  }

  if (text) {
    _text = text
  }

  const { t } = useTranslation()

  return (
    <Flex direction={'column'} align={'center'} className={classes.root}>
      <div className={classes.label}>{status}</div>
      <Text pb={30} color="dimmed" size="m" ta="center" className={classes.description}>
        {_text}
      </Text>
      {authResult && !authResult.authorized && (
        <>
          <Flex justify={'center'} align={'center'}>
            <Card shadow="sm" radius="md" ta="center" className={classes.errorMessage}>
              <Text>{`${upperFirst(authResult.errorMessage)}.`}</Text>
            </Card>
          </Flex>
        </>
      )}
      <Group align="center" justify="center">
        <Button
          size="md"
          color="teal"
          onClick={() => {
            navigate('/')
          }}
        >
          {t('errorPage.backHomeButton')}
        </Button>
        <Button
          size="md"
          onClick={() => {
            navigate(-1)
          }}
        >
          {t('errorPage.backPreviousButton')}
        </Button>
      </Group>
    </Flex>
  )
}
