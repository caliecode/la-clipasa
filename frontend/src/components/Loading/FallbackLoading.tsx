import { motion } from 'framer-motion'
import cloudsDark from 'src/assets/logo/two-white-clouds.svg'
import cloudsLight from 'src/assets/logo/two-black-clouds.svg'
import React, { useEffect } from 'react'
import { RouteLoading } from './FallbackLoading.styles'
import { useUISlice } from 'src/slices/ui'
import { useMantineColorScheme, useMantineTheme } from '@mantine/core'
import { useLocation } from 'react-router-dom'
import PageTemplate from 'src/components/PageTemplate'
import { PostSkeleton } from 'src/components/Post/components/Post.Skeleton'
import { PostFiltersSkeleton } from 'src/components/PostFilters/PostFilters.Skeleton'

export default function FallbackLoading() {
  const location = useLocation()
  const { colorScheme } = useMantineColorScheme()
  console.log(location.pathname)

  if (location.pathname === '/' || location.pathname.startsWith('/post/')) {
    return (
      <PageTemplate minWidth={'60vw'} sidePanel={<PostFiltersSkeleton />}>
        <>
          {Array.from({ length: 5 }).map((_, index) => (
            <PostSkeleton style={{ marginBottom: 12 }} key={String(index)} />
          ))}
        </>
      </PageTemplate>
    )
  }

  return (
    <RouteLoading>
      <motion.div
        className="logo"
        animate={{
          y: [0, -20, 0],
          rotate: [0, 0, 0],
          transition: {
            duration: 2,
            loop: Infinity,
            ease: 'easeInOut',
          },
        }}
      >
        <img src={colorScheme === 'dark' ? cloudsDark : cloudsLight} width="80" />
      </motion.div>
      {/* // animate a boxshadow below the svg that grows and shrinks width*/}
      <motion.div
        animate={{
          // zoom in in the x direction
          zoom: [1, 1.2, 1],
          transition: {
            duration: 2,
            loop: Infinity,
            ease: 'easeInOut',
          },
        }}
      >
        <div
          style={{
            width: '110px',
            height: '10px',
            float: 'right',
            left: '50%',
            bottom: '50%',
            borderRadius: '50%',
            boxShadow: '0 50px 14px rgba(0, 0, 0, 0.64)',
          }}
        ></div>
      </motion.div>
    </RouteLoading>
  )
}
