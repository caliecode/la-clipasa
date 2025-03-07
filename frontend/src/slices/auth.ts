import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { produce } from 'immer'
import { useUISlice } from './ui' // Import your UI slice
import { AXIOS_INSTANCE } from 'src/api/backend-mutator'
import { useEffect } from 'react'
import { MeQuery } from 'src/graphql/gen'

type AuthState = {
  user: MeQuery['me']
  isLoading: boolean
  actions: {
    setUser: (user: MeQuery['me']) => void
    clearUser: () => void
    setIsLoading: (isLoading: boolean) => void
  }
}

const AUTH_SLICE_PERSIST_KEY = 'auth-slice'

export const useAuthSlice = create<AuthState>()((set) => ({
  user: null,
  isLoading: false,
  actions: {
    setUser: (user) => set({ user }),
    clearUser: () => set({ user: null }),
    setIsLoading: (isLoading) => set({ isLoading }),
  },
}))
