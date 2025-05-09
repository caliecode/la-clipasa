import { RefObject, useEffect, useRef, useState } from 'react'
import { Helmet } from 'react-helmet'
// import Navbar from '../Navbar/Navbar'
import { Fragment } from 'react'
import shallow from 'zustand/shallow'
import {
  ActionIcon,
  ActionIconGroup,
  AppShell,
  Avatar,
  Drawer,
  Flex,
  Group,
  Loader,
  Menu,
  Skeleton,
  Tabs,
  Text,
  Tooltip,
  UnstyledButton,
  useMantineColorScheme,
  useMantineTheme,
  Container,
  Select,
  Center,
  Image,
  Badge,
  Burger,
  ScrollArea,
  Button,
} from '@mantine/core'
import broadcasterIcon from 'src/assets/img/caliebre-logo.png'
import {
  IconLogout,
  IconHeart,
  IconSettings,
  IconChevronDown,
  IconBrandTwitter,
  IconBrandYoutube,
  IconBrandInstagram,
  IconBrandTwitch,
  IconUsers,
  IconBrandGithub,
  IconUser,
} from '@tabler/icons'
import useAuthenticatedUser, { logUserOut } from 'src/hooks/auth/useAuthenticatedUser'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import logoDark from 'src/assets/logo/two-white-clouds.svg'
import logoLight from 'src/assets/logo/two-black-clouds.svg'
import { useUISlice } from 'src/slices/ui'
import cx from 'clsx'
import LoginButton from 'src/components/LoginButton'
import { useColorScheme, useDisclosure } from '@mantine/hooks'
import { ThemeSwitcher } from 'src/components/ThemeSwitcher'
import { entries } from 'src/utils/object'
import { uiPath } from 'src/ui-paths'
import { EMOTES } from 'src/assets/img/emotes'
import { ErrorPage } from 'src/components/ErrorPage/ErrorPage'
import HttpStatus from 'src/utils/httpStatus'
import BroadcasterTokenButton from 'src/components/BroadcasterTokenModal'
import { checkAuthorization, redirectToBroadcasterAuthLogin, redirectToUserAuthLogin } from 'src/services/authorization'
import BroadcasterTokenModal from 'src/components/BroadcasterTokenModal'
import banner from 'src/assets/img/banner-la-clipassa.png'
import homeBackground from 'src/assets/img/background-la-clipassa.jpg'
import styles from './Layout.module.css'
import PostFilters from 'src/components/PostFilters/PostFilters'
import { withBaseURL } from 'src/utils/urls'
import { Trans, useTranslation } from 'react-i18next'
import LanguageToggle from 'src/components/LanguageToggle'
import { IconDeviceDesktopAnalytics } from '@tabler/icons-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { notifications } from '@mantine/notifications'

type LayoutProps = {
  children: React.ReactElement
}

const SW_UPDATE_INTERVAL_MS = 2 * 60 * 60 * 1000
export default function Layout({ children }: LayoutProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [avatarMenuOpened, { toggle }] = useDisclosure(false)
  const [userMenuOpened, setUserMenuOpened] = useState(false)
  const { user, isAuthenticating } = useAuthenticatedUser()
  const { colorScheme } = useMantineColorScheme() // TODO: app logo useffect
  const { burgerOpened, setBurgerOpened } = useUISlice()
  const [broadcasterTokenModalOpened, { open: openBroadcasterTokenModal, close: closeBroadcasterTokenModal }] =
    useDisclosure(false)
  const notificationIdRef = useRef<string | null>(null)
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null)

  // --- PWA Update Logic ---
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(swUrl, r) {
      console.log(`Service Worker registered: ${swUrl}`)
      if (r) {
        console.log('Workbox registration object available:', r)
        swRegistrationRef.current = r
      }
      setInterval(() => {
        console.log('Checking for SW update...')
        r?.update()
      }, SW_UPDATE_INTERVAL_MS)
    },
    onRegisterError(error) {
      console.error('Service Worker registration error:', error)
    },
  })

  const handleManualUpdateCheck = () => {
    console.log('Manually triggering SW update check...')
    if (!swRegistrationRef.current) {
      console.warn('SW Registration not available yet.')
      notifications.show({
        color: 'orange',
        title: 'PWA Info',
        message: 'Service Worker registration not ready yet. Try again in a moment.',
      })
      return
    }
    swRegistrationRef.current
      .update()
      .then((hasUpdate) => {
        // Note: .update() itself doesn't directly return if needRefresh will trigger.
        // It just initiates the check. We rely on the useRegisterSW hook's
        // internal logic watching for the 'waiting' state.
        console.log('SW update check initiated.')
        if (!needRefresh) {
          notifications.show({
            color: 'green',
            title: 'PWA Info',
            message: 'No new version detected by the hook yet.',
          })
        }
      })
      .catch((err) => {
        console.error('Error checking for SW update:', err)
        notifications.show({ color: 'red', title: 'PWA Error', message: 'Failed to check for updates.' })
      })
  }

  useEffect(() => {
    if (needRefresh) {
      if (!notificationIdRef.current || !notifications.update) {
        const id = notifications.show({
          id: 'pwa-update',
          title: t('pwa.updateAvailableTitle'),
          message: (
            <Flex direction="column" gap={8}>
              {t('pwa.updateAvailableMessage')}
              <Button
                variant="light"
                color="blue"
                size="xs"
                w="100%"
                onClick={() => {
                  notifications.hide('pwa-update')
                  notificationIdRef.current = null
                  updateServiceWorker(true)
                    .then(() => {
                      console.log('Forcing window reload...')
                      window.location.reload()
                    })
                    .catch((err) => {
                      notifications.show({ color: 'red', title: 'PWA Error', message: 'Failed to update the app.' })
                    })
                }}
              >
                {t('common.update')}
              </Button>
            </Flex>
          ),
          color: 'blue',
          autoClose: false,
          withCloseButton: true,
          onClose: () => {
            notificationIdRef.current = null
          },
        })
        notificationIdRef.current = id
        console.log('PWA Update notification shown.')
      } else {
        console.log('PWA Update notification already shown.')
      }
    } else {
      if (notificationIdRef.current) {
        console.log('Hiding PWA Update notification as needRefresh is false.')
        notifications.hide(notificationIdRef.current)
        notificationIdRef.current = null
      }
    }
  }, [needRefresh, updateServiceWorker, t])
  // --- End PWA Update Logic ---

  const tabs = []
  const tabComponents = tabs.map((tab) => (
    <Tabs.Tab value={tab} key={tab}>
      {tab}
    </Tabs.Tab>
  ))

  const [logo, setLogo] = useState<string>(colorScheme === 'dark' ? logoDark : logoLight)
  const ui = useUISlice()
  const title = burgerOpened ? t('layout.closeNavigation') : t('layout.openNavigation')

  useEffect(() => {
    setLogo(colorScheme === 'dark' ? logoDark : logoLight)
  }, [colorScheme])

  const onLogout = async () => {
    ui.setIsLoggingOut(true)
    await logUserOut(queryClient)
    ui.setIsLoggingOut(false)
  }

  function renderUserMenuButton() {
    if (ui.isLoggingOut || isAuthenticating)
      return (
        <Group gap={'md'} align="center">
          <Loader size={'sm'} variant="dots"></Loader>
          {isAuthenticating && <Text>{t('layout.loggingIn')}</Text>}
          {ui.isLoggingOut && <Text>{t('layout.loggingOut')}</Text>}
        </Group>
      )

    return (
      <UnstyledButton className={cx(styles.user, { [styles.userActive as string]: userMenuOpened })}>
        <Group gap={'xs'} m={4} align="center">
          {user ? (
            <Avatar alt={user.displayName} radius="xl" size={28} src={withBaseURL(user.profileImage)} />
          ) : (
            <>
              <Avatar radius="xl" size={28}>
                <IconUser size={16} />
              </Avatar>
              <Text className={styles.displayName} fw={500} size="sm">
                {t('common.login')}
              </Text>
            </>
          )}
          {user && (
            <Text className={styles.displayName} fw={500} size="sm">
              {user.displayName}
            </Text>
          )}
          <IconChevronDown size={12} stroke={1.5} />
        </Group>
      </UnstyledButton>
    )
  }

  return (
    <Fragment>
      <Helmet>
        <title>{t('layout.pageTitle')}</title>
        <meta name="description" content={t('layout.pageDescription')} title={t('layout.pageMetaTitle')} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Helmet>{' '}
      <Banner />
      <AppShell
        style={{
          height: 'calc(100% - var(--header-height) - var(--footer-height))',
        }}
        className={styles.appShell}
        header={{ height: 'var(--header-height)' }}
        footer={{ height: 'var(--footer-height)' }}
        navbar={{
          width: 300,
          breakpoint: 'sm',
          collapsed: { mobile: !avatarMenuOpened, desktop: !avatarMenuOpened },
        }}
        // aside={{ width: 300, breakpoint: 'md', collapsed: { desktop: false, mobile: true } }}
      >
        <AppShell.Header className={styles.sticky}>
          <Group
            h="100%"
            w="100%"
            px="md"
            style={{
              alignSelf: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Group align="center" gap={'xs'}>
              <Burger
                className={styles.burger}
                size={'sm'}
                opened={burgerOpened}
                onClick={() => setBurgerOpened(!burgerOpened)}
                title={title}
              />

              {window.innerWidth < 768 && (
                <Image
                  alt="la clipasa"
                  src={logo}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  className={styles.logo}
                  onClick={() => navigate('/')}
                />
              )}
            </Group>
            <div> </div>
            {/* {broadcasterLive ? (
              <LiveAvatar streamTitle={twitchBroadcasterLive?.data?.data?.[0]?.title}></LiveAvatar>
            ) : (
              <div></div>
            )} */}
            <Group>
              <Menu
                width={220}
                position="bottom-end"
                onClose={() => setUserMenuOpened(false)}
                onOpen={() => setUserMenuOpened(true)}
              >
                <Menu.Target>{renderUserMenuButton()}</Menu.Target>
                <Menu.Dropdown classNames={{ dropdown: styles.menuDropdown }}>
                  <Group justify="center">
                    <LanguageToggle />
                  </Group>
                  <Menu.Divider />
                  <Menu.Label>{t('common.theme')}</Menu.Label>
                  <ThemeSwitcher />

                  {user
                    ? checkAuthorization({ user, requiredRole: 'ADMIN' }).authorized && (
                        <>
                          <Menu.Divider />
                          <Menu.Label>Admin</Menu.Label>
                          <Menu.Item
                            component="a"
                            color={
                              window.location.href.includes(uiPath('/admin/users-management'))
                                ? 'var(--mantine-primary-color-6)'
                                : 'inherit'
                            }
                            leftSection={<IconUsers size={14} stroke={1.5} />}
                            onClick={() => navigate(uiPath('/admin/users-management'))}
                          >
                            {t('layout.userManagement')}
                          </Menu.Item>
                        </>
                      )
                    : null}

                  <Menu.Divider />
                  <Menu.Item
                    leftSection={<IconBrandGithub size={14} stroke={1.5} />}
                    onClick={() => window.open('https://github.com/caliecode/la-clipasa', '_blank')}
                  >
                    {t('layout.contribute')}
                  </Menu.Item>

                  {user ? (
                    <>
                      <Menu.Divider />
                      <Menu.Label>Settings</Menu.Label>
                      <Menu.Item leftSection={<IconSettings size={14} stroke={1.5} />}>
                        {t('layout.accountSettings')}
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconDeviceDesktopAnalytics size={14} stroke={1.5} />}
                        onClick={() => navigate(uiPath('/settings/sessions'))}
                      >
                        {t('layout.sessionManagement')}
                      </Menu.Item>
                      <Menu.Item
                        onClick={() => openBroadcasterTokenModal()}
                        leftSection={<IconBrandTwitch size={14} stroke={1.5} />}
                      >
                        {t('layout.broadcasterToken')}
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item leftSection={<IconLogout size={14} stroke={1.5} />} onClick={onLogout}>
                        {t('common.logout')}
                      </Menu.Item>
                    </>
                  ) : (
                    <>
                      <Menu.Divider />
                      <Menu.Item
                        leftSection={<IconBrandTwitch size={14} stroke={1.5} />}
                        className={styles.twitchLogin}
                        onClick={redirectToUserAuthLogin}
                      >
                        {t('common.twitchLogin')}
                      </Menu.Item>
                    </>
                  )}

                  <Menu.Label c="dimmed" style={{ display: 'none' }}>
                    Version: {import.meta.env.VITE_BUILD_VERSION} (1)
                  </Menu.Label>
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Group>
          <Container>
            <Tabs
              defaultValue="Home"
              variant="outline"
              classNames={{
                root: styles.tabs,
                tabSection: styles.tabsList,
                tab: styles.tab,
              }}
            >
              <Tabs.List>{tabComponents}</Tabs.List>
            </Tabs>
          </Container>
        </AppShell.Header>
        {/* See https://ui.mantine.dev/category/navbars/ for more interesting navbars */}
        <AppShell.Navbar p="md">
          Navbar
          {Array(15)
            .fill(0)
            .map((_, index) => (
              <Skeleton key={index} h={28} mt="sm" animate={false} />
            ))}
        </AppShell.Navbar>
        <AppShell.Main
          className={styles.main}
          style={{
            background: `url(${homeBackground}) no-repeat`,
            backgroundAttachment: 'fixed',
            backgroundPosition: 'center center',
            backgroundSize: 'cover',
          }}
        >
          {user?.twitchInfo?.isBanned ? (
            <ErrorPage status={HttpStatus.I_AM_A_TEAPOT_418} text="You are banned from using this service" />
          ) : (
            // TODO: Translate this specific ban message
            children
          )}
        </AppShell.Main>
        <Drawer
          className={styles.drawer}
          transitionProps={{ transition: 'fade', duration: 200, timingFunction: 'ease' }}
          opened={burgerOpened}
          onClose={() => {
            setBurgerOpened(false)
          }}
        >
          <Flex align={'center'} direction="column" pb="var(--footer-height)">
            <PostFilters />
          </Flex>
        </Drawer>
        {/* <AppShell.Aside p="md">Aside</AppShell.Aside> */}
        <BroadcasterTokenModal
          isOpen={broadcasterTokenModalOpened}
          onClose={closeBroadcasterTokenModal}
          onConfirm={() => redirectToBroadcasterAuthLogin()}
        />
        <AppShell.Footer className={styles.footer}>
          <Container className={styles.inner}>
            <Text fz="xs">
              <Group gap={5} align="start" wrap="nowrap">
                <Trans
                  i18nKey="layout.footer.madeWithLove"
                  components={{
                    love: <Image src={EMOTES.calieAMOR2} style={{ width: '20px', height: '20px' }}></Image>,
                    link: (
                      <a
                        href="https://www.twitch.tv/caliebre"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'orange' }}
                      >
                        caliebre
                      </a>
                    ),
                  }}
                ></Trans>
              </Group>
            </Text>

            <Group gap={5} align="end" wrap="nowrap" className={styles.links}>
              <Tooltip label={t('layout.footer.followTwitter')}>
                <ActionIcon size="lg" variant="subtle">
                  <a href="https://www.twitter.com/caliebre" target="_blank" rel="noopener noreferrer">
                    <IconBrandTwitter size={18} stroke={1.5} color="#2d8bb3" />{' '}
                  </a>
                </ActionIcon>
              </Tooltip>
              <Tooltip label={t('layout.footer.followYoutube')}>
                <ActionIcon size="lg" variant="subtle">
                  <a href="https://youtube.com/caliebre" target="_blank" rel="noopener noreferrer">
                    <IconBrandYoutube size={18} stroke={1.5} color="#d63808" />
                  </a>
                </ActionIcon>
              </Tooltip>
              <Tooltip label={t('layout.footer.followInstagram')}>
                <ActionIcon size="lg" variant="subtle">
                  <a href="http://www.instagram.com/caliebre" target="_blank" rel="noopener noreferrer">
                    <IconBrandInstagram size={18} stroke={1.5} color="#e15d16" />
                  </a>
                </ActionIcon>
              </Tooltip>
              <Tooltip label={t('layout.footer.followTwitch')}>
                <ActionIcon size="lg" variant="subtle">
                  <a href="https://www.twitch.tv/caliebre" target="_blank" rel="noopener noreferrer">
                    <IconBrandTwitch size={18} stroke={1.5} color="#a970ff" />
                  </a>
                </ActionIcon>
              </Tooltip>
            </Group>
          </Container>
        </AppShell.Footer>
      </AppShell>
      {/* </ThemeProvider> */}
    </Fragment>
  )
}

function Banner() {
  const navigate = useNavigate()
  return (
    <Image
      alt="la clipasa"
      src={banner}
      onClick={() => navigate('/')}
      className={styles.showOnLargeOnly}
      style={{
        cursor: 'pointer',
        height: 'var(--banner-height)',
        width: '100%',
        backgroundImage: `url(${banner})`,
        animation: 'slideIn 0.3s ease-in-out',
      }}
    />
  )
}

function LiveAvatar({ streamTitle }) {
  const theme = useMantineTheme()
  const colorScheme = useColorScheme()
  return (
    <Group align="center">
      <Tooltip label={streamTitle}>
        <a href="https://www.twitch.tv/caliebre" target="_blank" rel="noopener noreferrer">
          <div style={{ position: 'relative' }}>
            <img src={broadcasterIcon} alt="caliebre" height={40} width={40} className={styles.avatar} />
            <Badge className={styles.liveBadge} variant="filled" radius={5} size="xs">
              LIVE
            </Badge>
          </div>
        </a>
      </Tooltip>
    </Group>
  )
}
