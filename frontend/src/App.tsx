import 'src/assets/css/fonts.css'
import 'src/assets/css/overrides.css'
import 'src/assets/css/pulsate.css'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/code-highlight/styles.css'
import '@mantine/dates/styles.css'
import 'mantine-react-table/styles.css' //import MRT styles

import React, { useEffect, useState } from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import FallbackLoading from 'src/components/Loading/FallbackLoading'
// import 'regenerator-runtime/runtime'
import { MantineProvider, createTheme, localStorageColorSchemeManager } from '@mantine/core'
import ProtectedRoute from 'src/components/Permissions/ProtectedRoute'
import { useNotificationAPI } from 'src/hooks/ui/useNotificationAPI'
import { ModalsProvider } from '@mantine/modals'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Notifications } from '@mantine/notifications'
import { ErrorPage } from 'src/components/ErrorPage/ErrorPage'
import HttpStatus from 'src/utils/httpStatus'
import _ from 'lodash'

import { AppTourProvider } from 'src/tours/AppTourProvider'

import 'src/utils/dayjs'
import { UiRoutes } from 'src/ui-paths'
import { createUrqlClient } from 'src/services/urql'
import { Provider } from 'urql'
import useAuthenticatedUser from 'src/hooks/auth/useAuthenticatedUser'

function ErrorFallback({ error }: any) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre style={{ color: 'red' }}>{error.message}</pre>
    </div>
  )
}

const Layout = React.lazy(() => import('./components/Layout/Layout'))
const LandingPage = React.lazy(() => import('./views/LandingPage/LandingPage'))
const UserPermissionsPage = React.lazy(() => import('src/views/Settings/UserPermissionsPage/UserPermissionsPage'))

const colorSchemeManager = localStorageColorSchemeManager({ key: 'theme' })

const routes = Object.freeze({
  '*': (
    <ProtectedRoute>
      <ErrorPage status={HttpStatus.NOT_FOUND_404} />
    </ProtectedRoute>
  ),
  '/admin/users-management': (
    <ProtectedRoute>
      <UserPermissionsPage />
    </ProtectedRoute>
  ),
  '/': <LandingPage />,
  '/admin': <LandingPage />,
  '/admin/posts-management': <LandingPage />,
  '/post/:postId': <LandingPage />,
  '/profile': <LandingPage />,
} satisfies Readonly<Record<UiRoutes, React.ReactNode>>)

export default function App() {
  const { verifyNotificationPermission } = useNotificationAPI()
  const [notificationWarningSent, setNotificationWarningSent] = useState(false)

  useEffect(() => {
    if (!notificationWarningSent) {
      verifyNotificationPermission()
      setNotificationWarningSent(true)
    }
  }, [verifyNotificationPermission, notificationWarningSent])

  return (
    <>
      <Provider value={createUrqlClient()}>
        <MantineProvider
          colorSchemeManager={colorSchemeManager}
          defaultColorScheme="dark"
          theme={createTheme({
            shadows: {
              md: '1px 1px 3px rgba(0, 0, 0, .25)',
              xl: '5px 5px 3px rgba(0, 0, 0, .25)',
            },
            fontFamily: 'Catamaran, Arial, sans-serif',
          })}
        >
          <ModalsProvider
            labels={{ confirm: 'Submit', cancel: 'Cancel' }}
            modalProps={{ styles: { root: { marginTop: '100px', zIndex: 20000 } } }}
          >
            <Notifications />
            <BrowserRouter basename="/ui">
              <React.Suspense
                fallback={<div style={{ backgroundColor: 'rgb(20, 21, 25)', height: '100vh', width: '100vw' }} />}
              >
                <AppTourProvider>
                  <Layout>
                    <Routes>
                      {Object.entries(routes).map(([path, component], index) => (
                        <Route
                          key={index}
                          path={path}
                          element={<React.Suspense fallback={<FallbackLoading />}>{component}</React.Suspense>}
                        />
                      ))}
                    </Routes>
                  </Layout>
                </AppTourProvider>
              </React.Suspense>
            </BrowserRouter>
          </ModalsProvider>
        </MantineProvider>
        {!import.meta.env.PROD && <ReactQueryDevtools initialIsOpen />}
      </Provider>
    </>
  )
}
