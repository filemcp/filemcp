import { defineStore } from 'pinia'
import type { User } from '@filemcp/types'

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

const TOKEN_COOKIE = 'access_token'
const MAX_AGE = 7 * 24 * 3600

export const useAuthStore = defineStore('auth', () => {
  const tokenCookie = useCookie<string | null>(TOKEN_COOKIE, { maxAge: MAX_AGE, path: '/', sameSite: 'lax' })

  const token = computed(() => tokenCookie.value)
  const user = ref<AuthState['user']>(null)
  const orgs = ref<OrgSummary[]>([])
  const activeOrgSlug = ref<string | null>(null)

  const isAuthenticated = computed(() => !!tokenCookie.value)
  const activeOrg = computed<OrgSummary | null>(
    () => orgs.value.find((o) => o.slug === activeOrgSlug.value) ?? orgs.value[0] ?? null,
  )

  function setSession(newToken: string, newUser: AuthState['user']) {
    tokenCookie.value = newToken
    user.value = newUser
    if (import.meta.client) {
      if (newUser) localStorage.setItem('auth_user', JSON.stringify(newUser))
    }
  }

  function setOrgs(newOrgs: OrgSummary[]) {
    orgs.value = newOrgs
    if (!newOrgs.find((o) => o.slug === activeOrgSlug.value)) {
      activeOrgSlug.value = user.value?.username ?? newOrgs[0]?.slug ?? null
    }
    if (import.meta.client) {
      localStorage.setItem('auth_orgs', JSON.stringify(newOrgs))
      localStorage.setItem('auth_active_org', activeOrgSlug.value ?? '')
    }
  }

  function switchOrg(slug: string) {
    activeOrgSlug.value = slug
    if (import.meta.client) {
      localStorage.setItem('auth_active_org', slug)
    }
  }

  function loadFromStorage() {
    if (import.meta.client) {
      try {
        const userRaw = localStorage.getItem('auth_user')
        if (userRaw) user.value = JSON.parse(userRaw)
        const orgsRaw = localStorage.getItem('auth_orgs')
        if (orgsRaw) orgs.value = JSON.parse(orgsRaw)
        const activeOrg = localStorage.getItem('auth_active_org')
        if (activeOrg) activeOrgSlug.value = activeOrg
      } catch {}
    }
  }

  function logout() {
    tokenCookie.value = null
    user.value = null
    orgs.value = []
    activeOrgSlug.value = null
    if (import.meta.client) {
      localStorage.removeItem('auth_user')
      localStorage.removeItem('auth_orgs')
      localStorage.removeItem('auth_active_org')
    }
  }

  return { token, user, orgs, activeOrgSlug, isAuthenticated, activeOrg, setSession, setOrgs, switchOrg, loadFromStorage, logout }
})
