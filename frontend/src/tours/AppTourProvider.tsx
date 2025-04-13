import React, { useEffect } from 'react'
import { TourProvider, useTour, StepType } from '@reactour/tour'
import { useMantineColorScheme, useMantineTheme } from '@mantine/core'
import { useLocation } from 'react-router-dom'
import { parseUrl } from 'src/ui-paths'
import { useMediaQuery } from '@mantine/hooks'

const borderRadius = 8
const COMPLETED_TOURS_KEY = 'completed-tours'

const TOUR_IDS = {
  MOBILE_POST_TOUR: 'mobile-post-tour',
}

type CustomStep = StepType & {
  eventListener: EventListenerOrEventListenerObject
  cleanup: (...args: any) => void
}

const getCompletedTours = (): string[] => {
  const storedTours = localStorage.getItem(COMPLETED_TOURS_KEY)
  return storedTours ? JSON.parse(storedTours) : []
}

const markTourCompleted = (tourId: string): void => {
  const completedTours = getCompletedTours()
  if (!completedTours.includes(tourId)) {
    completedTours.push(tourId)
    localStorage.setItem(COMPLETED_TOURS_KEY, JSON.stringify(completedTours))
  }
}

const isTourCompleted = (tourId: string): boolean => {
  return getCompletedTours().includes(tourId)
}

const resetTour = (tourId: string): void => {
  const completedTours = getCompletedTours()
  const updatedTours = completedTours.filter((id) => id !== tourId)
  localStorage.setItem(COMPLETED_TOURS_KEY, JSON.stringify(updatedTours))
}

const resetAllTours = (): void => {
  localStorage.removeItem(COMPLETED_TOURS_KEY)
}

const TourController = () => {
  const { setSteps, setIsOpen, setCurrentStep, currentStep, isOpen, steps } = useTour()
  const location = useLocation()
  const tour = useTour()
  const isMobile = useMediaQuery('(max-width: 1100px)', window.innerWidth < 1100)

  const [activeTourId, setActiveTourId] = React.useState<string | null>(null)

  function incrementStep(steps: CustomStep[], tourId: string) {
    if (currentStep === steps.length - 1) {
      markTourCompleted(tourId)
      tour.setIsOpen(false)
      setActiveTourId(null)
      return
    }
    steps[currentStep]?.cleanup()
    setCurrentStep((prevStep) => prevStep + 1)
  }

  const postDetailSteps: CustomStep[] = [
    {
      selector: '[data-tour="swipe-area"]',
      content: 'Swipe here to see the next post.',
      action(elem) {
        console.log('1- adding event listeners for tour')
        const input = document.querySelector('[data-tour="swipe-area"]')
        input?.addEventListener('touchend', this.eventListener)
      },
      eventListener(e: TouchEvent) {
        incrementStep(postDetailSteps, TOUR_IDS.MOBILE_POST_TOUR)
      },
      cleanup() {
        console.log('cleanup for 1')
        const input = document.querySelector('[data-tour="swipe-area"]')
        input?.removeEventListener('touchend', this.eventListener)
      },
    },
  ]

  useEffect(() => {
    const timer = setTimeout(() => {
      let newSteps: StepType[] = []
      let newTourId: string | null = null
      const currentUrl = window.location.href
      const parsed = parseUrl(currentUrl)

      switch (parsed?.routePattern) {
        case '/post/:postId':
          if (isMobile) {
            newTourId = TOUR_IDS.MOBILE_POST_TOUR

            if (!isTourCompleted(newTourId)) {
              newSteps = postDetailSteps
            }
          }
          break

        default:
          if (isOpen) {
            setIsOpen(false)
            setActiveTourId(null)
          }
          return
      }

      if (newSteps.length > 0 && newTourId) {
        setActiveTourId(newTourId)
        const currentSteps = tour.steps
        if (JSON.stringify(newSteps) !== JSON.stringify(currentSteps)) {
          setSteps!(newSteps)
          setCurrentStep(0)
          setIsOpen(true)
        } else if (!isOpen) {
          setIsOpen(true)
        }
        return
      }

      if (isOpen) {
        setIsOpen(false)
        setActiveTourId(null)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [location.pathname, setSteps, setIsOpen, setCurrentStep, isOpen])

  return null
}

export const AppTourProvider = ({ children }) => {
  const { colorScheme } = useMantineColorScheme()
  const [activeTourId, setActiveTourId] = React.useState<string | null>(null)
  const location = useLocation()

  const getCurrentTourId = (): string | null => {
    const currentUrl = window.location.href
    const parsed = parseUrl(currentUrl)

    if (parsed?.routePattern === '/post/:postId') {
      return TOUR_IDS.MOBILE_POST_TOUR
    }

    return null
  }

  return (
    <TourProvider
      steps={[]}
      styles={{
        badge: (props) => ({
          ...props,
          borderRadius: `${borderRadius}px 0 ${borderRadius}px 0`,
          fontSize: 12,
          marginTop: 10,
          marginLeft: 10,
        }),
        arrow: (props) => ({ ...props, marginBottom: -10 }),
        close: (props) => ({ ...props, marginTop: -10, marginRight: -10 }),
        popover: (props) => ({
          ...props,
          borderRadius: borderRadius,
          background: colorScheme === 'dark' ? 'var(--mantine-color-dark-7)' : 'var(--mantine-color-gray-0)',
          color: colorScheme === 'dark' ? 'var(--mantine-color-gray-0)' : 'var(--mantine-color-dark-7)',
        }),
      }}
      showDots
      showNavigation
      disableFocusLock={false}
      disableInteraction={false}
      badgeContent={({ currentStep, totalSteps }) => (
        <div>
          {currentStep + 1} / {totalSteps}
        </div>
      )}
      onClickClose={() => {
        const tourId = getCurrentTourId()
        if (tourId) {
          markTourCompleted(tourId)
          setActiveTourId(null)
        }
        return
      }}
    >
      {children}
      <TourController />
    </TourProvider>
  )
}
