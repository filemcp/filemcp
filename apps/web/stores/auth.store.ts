import { defineStore } from 'pinia'
import type { User } from '@cdnmcp/types'

interface OrgSummary {
  slug: string
  name: string
  role: 'OWNER' | 'WRITE' | 'READ'
}

interface AuthState {
  token: string | null
  user: Pick<User, 'id' | 'username' | 'email'> | null
  orgs: OrgSummary[]
  activeOrgSlug: string | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: null,
    user: null,
    orgs: [],
    activeOrgSlug: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    activeOrg: (state): OrgSummary | null =>
      state.orgs.find((o) => o.slug === state.activeOrgSlug) ?? state.orgs[0] ?? null,
  },

  actions: {
    setSession(token: string, user: AuthState['user']) {
      this.token = token
      this.user = user
      if (import.meta.client) {
        localStorage.setItem('access_token', token)
        if (user) localStorage.setItem('auth_user', JSON.stringify(user))
        document.cookie = `access_token=${token}; path=/; SameSite=Lax; max-age=${7 * 24 * 3600}`
      }
    },

    setOrgs(orgs: OrgSummary[]) {
      this.orgs = orgs
      // Keep activeOrgSlug if it's still valid, otherwise default to personal org
      if (!orgs.find((o) => o.slug === this.activeOrgSlug)) {
        this.activeOrgSlug = this.user?.username ?? orgs[0]?.slug ?? null
      }
      if (import.meta.client) {
        localStorage.setItem('auth_orgs', JSON.stringify(orgs))
        localStorage.setItem('auth_active_org', this.activeOrgSlug ?? '')
      }
    },

    switchOrg(slug: string) {
      this.activeOrgSlug = slug
      if (import.meta.client) {
        localStorage.setItem('auth_active_org', slug)
      }
    },

    loadFromStorage() {
      if (import.meta.client) {
        const token = localStorage.getItem('access_token')
        if (token) this.token = token
        try {
          const userRaw = localStorage.getItem('auth_user')
          if (userRaw) this.user = JSON.parse(userRaw)
          const orgsRaw = localStorage.getItem('auth_orgs')
          if (orgsRaw) this.orgs = JSON.parse(orgsRaw)
          const activeOrg = localStorage.getItem('auth_active_org')
          if (activeOrg) this.activeOrgSlug = activeOrg
        } catch {}
      }
    },

    logout() {
      this.token = null
      this.user = null
      this.orgs = []
      this.activeOrgSlug = null
      if (import.meta.client) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('auth_user')
        localStorage.removeItem('auth_orgs')
        localStorage.removeItem('auth_active_org')
        document.cookie = 'access_token=; path=/; max-age=0'
      }
    },
  },
})
