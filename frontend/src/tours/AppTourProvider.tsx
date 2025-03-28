import React, { useEffect } from 'react'
import { TourProvider, useTour, StepType } from '@reactour/tour'
import { useMantineColorScheme, useMantineTheme } from '@mantine/core'
import { useLocation } from 'react-router-dom'
import { parseUrl } from 'src/ui-paths'
import { useMediaQuery } from '@mantine/hooks'

const borderRadius = 8

type CustomStep = StepType & {
  eventListener: EventListenerOrEventListenerObject
  cleanup: (...args: any) => void
}

const TourController = () => {
  const { setSteps, setIsOpen, setCurrentStep, currentStep, isOpen, steps } = useTour()
  const location = useLocation()
  const tour = useTour()

  function incrementStep(steps: CustomStep[]) {
    if (currentStep === steps.length) {
      tour.setIsOpen(false)
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
        incrementStep(postDetailSteps)
      },
      cleanup() {
        console.log('cleanup for 1')
        const input = document.querySelector('[data-tour="swipe-area"]')
        input?.removeEventListener('touchend', this.eventListener)
      },
    },
  ]

  const isMobile = useMediaQuery('(max-width: 768px)', window.innerWidth < 768)

  useEffect(() => {
    const timer = setTimeout(() => {
      let newSteps: StepType[] = []
      const currentUrl = window.location.href
      const parsed = parseUrl(currentUrl)

      switch (parsed?.routePattern) {
        case '/post/:postId':
          if (isMobile) {
            newSteps = postDetailSteps
          }
          break
        default:
          if (isOpen) {
            setIsOpen(false)
          }
          return
      }

      if (newSteps.length > 0) {
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
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [location.pathname, setSteps, setIsOpen, setCurrentStep, isOpen])

  return null
}

export const AppTourProvider = ({ children }) => {
  const { colorScheme } = useMantineColorScheme()

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
        //stop the tour
        return
      }}
    >
      {children}
      <TourController />
    </TourProvider>
  )
}
