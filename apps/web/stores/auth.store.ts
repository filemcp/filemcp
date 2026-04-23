import { defineStore } from 'pinia'
import type { User } from '@cdnmcp/types'

interface AuthState {
  token: string | null
  user: Pick<User, 'id' | 'username' | 'email'> | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: null,
    user: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
  },

  actions: {
    setSession(token: string, user: AuthState['user']) {
      this.token = token
      this.user = user
      if (import.meta.client) {
        localStorage.setItem('access_token', token)
      }
    },

    loadFromStorage() {
      if (import.meta.client) {
        const token = localStorage.getItem('access_token')
        if (token) this.token = token
      }
    },

    logout() {
      this.token = null
      this.user = null
      if (import.meta.client) {
        localStorage.removeItem('access_token')
      }
    },
  },
})
