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
} from '@tabler/icons'
import useAuthenticatedUser, { logUserOut } from 'src/hooks/auth/useAuthenticatedUser'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
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
import { redirectToBroadcasterAuthLogin } from 'src/services/authorization'
import BroadcasterTokenModal from 'src/components/BroadcasterTokenModal'
import banner from 'src/assets/img/banner-la-clipassa.png'
import homeBackground from 'src/assets/img/background-la-clipassa.jpg'
import styles from './Layout.module.css'
import HomeSideActions from 'src/views/LandingPage/HomeSideActions'

type LayoutProps = {
  children: React.ReactElement
}

export default function Layout({ children }: LayoutProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [avatarMenuOpened, { toggle }] = useDisclosure(false)
  const [userMenuOpened, setUserMenuOpened] = useState(false)
  const { user, isAuthenticating } = useAuthenticatedUser()
  const { colorScheme } = useMantineColorScheme() // TODO: app logo useffect
  const { burgerOpened, setBurgerOpened } = useUISlice()
  const [broadcasterTokenOpened, { open: openBroadcasterToken, close: closeBroadcasterToken }] = useDisclosure(false)

  const tabs = []
  const tabComponents = tabs.map((tab) => (
    <Tabs.Tab value={tab} key={tab}>
      {tab}
    </Tabs.Tab>
  ))

  const [logo, setLogo] = useState<string>(colorScheme === 'dark' ? logoDark : logoLight)
  const ui = useUISlice()
  const title = burgerOpened ? 'Close navigation' : 'Open navigation'
  const bannerRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    setLogo(colorScheme === 'dark' ? logoDark : logoLight)
  }, [colorScheme])

  const onLogout = async () => {
    ui.setIsLoggingOut(true)
    await logUserOut(queryClient)
  }

  function renderAvatarMenu() {
    if (ui.isLoggingOut || isAuthenticating)
      return (
        <Group gap={'md'} align="center">
          <Loader size={'sm'} variant="dots"></Loader>
          {isAuthenticating && <Text>Logging in...</Text>}
          {ui.isLoggingOut && <Text>Logging out...</Text>}
        </Group>
      )

    return user ? (
      <UnstyledButton className={cx(styles.user, { [styles.userActive as string]: userMenuOpened })}>
        <Group gap={'xs'} m={4} align="center">
          <Avatar alt={user.displayName} radius="xl" size={28} src={user.profileImage} />
          <Text className={styles.displayName} fw={500} size="sm">
            {user.displayName}
          </Text>
          <IconChevronDown size={12} stroke={1.5} />
        </Group>
      </UnstyledButton>
    ) : (
      <LoginButton />
    )
  }
  const [isBannerHidden, setIsBannerHidden] = useState(false)

  return (
    <Fragment>
      <Helmet>
        <title>La Clipasa</title>
        <meta name="description" content="El mejor evento de todo Twitch International" title="La Clipasa - Caliebre" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Helmet>
      <ScrollArea.Autosize
        type="scroll"
        onScrollPositionChange={(pos) => {
          setIsBannerHidden(true)
        }}
        styles={{ scrollbar: { zIndex: 200 } }}
      >
        <Banner ref={bannerRef} hidden={isBannerHidden} />
        <AppShell
          style={{
            // transition: 'height 0.3s ease-out', // TODO: doesnt match
            height: isBannerHidden ? '100%' : `calc(100vh - var(--header-height) - var(--footer-height))`,
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
              <Burger
                className={styles.burger}
                size={'sm'}
                opened={burgerOpened}
                onClick={() => setBurgerOpened(!burgerOpened)}
                title={title}
              />
              <div> </div>
              {/* {broadcasterLive ? (
              <LiveAvatar streamTitle={twitchBroadcasterLive?.data?.data?.[0]?.title}></LiveAvatar>
            ) : (
              <div></div>
            )} */}

              <Menu
                width={220}
                position="bottom-end"
                onClose={() => setUserMenuOpened(false)}
                onOpen={() => {
                  if (user) setUserMenuOpened(true)
                }}
                disabled={!user}
              >
                <Menu.Target>{renderAvatarMenu()}</Menu.Target>
                <Menu.Dropdown classNames={{ dropdown: styles.menuDropdown }}>
                  <ThemeSwitcher />
                  <Menu.Divider />
                  <Menu.Label>Settings</Menu.Label>
                  <Menu.Item leftSection={<IconSettings size={14} stroke={1.5} />}>Account settings</Menu.Item>
                  <Menu.Item
                    onClick={() => openBroadcasterToken()}
                    leftSection={<IconBrandTwitch size={14} stroke={1.5} />}
                  >
                    Broadcaster token
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item leftSection={<IconLogout size={14} stroke={1.5} />} onClick={onLogout}>
                    Logout
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
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
            <Flex align={'center'} direction="column">
              <HomeSideActions />
            </Flex>
          </Drawer>
          {/* <AppShell.Aside p="md">Aside</AppShell.Aside> */}

          <BroadcasterTokenModal
            isOpen={broadcasterTokenOpened}
            onClose={closeBroadcasterToken}
            onConfirm={() => redirectToBroadcasterAuthLogin()}
          />
          <AppShell.Footer className={styles.footer}>
            <Container className={styles.inner}>
              <Text fz="xs">
                <Group gap={5} align="start" wrap="nowrap">
                  Made with
                  <Image src={EMOTES.calieAMOR2} width={20} height={20}></Image>
                  for{' '}
                  <a
                    href="https://www.twitch.tv/caliebre"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'orange' }}
                  >
                    caliebre
                  </a>
                </Group>
              </Text>

              <Group gap={5} align="end" wrap="nowrap" className={styles.links}>
                <Tooltip label={`Follow caliebre on Twitter`}>
                  <ActionIcon size="lg" variant="subtle">
                    <a href="https://www.twitter.com/caliebre" target="_blank" rel="noopener noreferrer">
                      <IconBrandTwitter size={18} stroke={1.5} color="#2d8bb3" />
                    </a>
                  </ActionIcon>
                </Tooltip>
                <Tooltip label={`Follow caliebre on YouTube`}>
                  <ActionIcon size="lg" variant="subtle">
                    <a href="https://youtube.com/caliebre" target="_blank" rel="noopener noreferrer">
                      <IconBrandYoutube size={18} stroke={1.5} color="#d63808" />
                    </a>
                  </ActionIcon>
                </Tooltip>
                <Tooltip label={`Follow caliebre on Instagram`}>
                  <ActionIcon size="lg" variant="subtle">
                    <a href="http://www.instagram.com/caliebre" target="_blank" rel="noopener noreferrer">
                      <IconBrandInstagram size={18} stroke={1.5} color="#e15d16" />
                    </a>
                  </ActionIcon>
                </Tooltip>
                <Tooltip label={`Follow caliebre on Twitch`}>
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
      </ScrollArea.Autosize>

      {/* </ThemeProvider> */}
    </Fragment>
  )
}

function Banner({ ref, hidden }: { ref: RefObject<HTMLImageElement>; hidden: boolean }) {
  const [displayNone, setDisplayNone] = useState(hidden)

  return (
    <Image
      alt="la clipasa"
      ref={ref}
      src={banner}
      className={`showOnLargeOnly`}
      style={{
        height: hidden ? '0' : 'var(--banner-height)',
        width: '100%',
        display: displayNone ? 'none' : 'inherit',
        backgroundImage: `url(${banner})`,
        animation: `${hidden ? 'slideOut' : 'slideIn'} 0.3s forwards`,
      }}
      onAnimationEnd={() => hidden && setDisplayNone(true)}
    />
  )
}

function LiveAvatar({ streamTitle }) {
  const theme = useMantineTheme()
  const colorScheme = useColorScheme()
  return (
    <Group align="center">
      <Tooltip label={streamTitle}>
        <a href={`https://www.twitch.tv/caliebre`} target="_blank" rel="noopener noreferrer">
          <div style={{ position: 'relative' }}>
            <img src={broadcasterIcon} alt={`caliebre`} height={40} width={40} className={styles.avatar} />
            <Badge className={styles.liveBadge} variant="filled" radius={5} size="xs">
              LIVE
            </Badge>
          </div>
        </a>
      </Tooltip>
    </Group>
  )
}
