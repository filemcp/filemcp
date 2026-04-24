import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './auth.store'

const mockUser = { id: 'u1', username: 'alice', email: 'alice@test.com' }
const mockOrgs = [
  { slug: 'alice', name: 'Alice', role: 'OWNER' as const },
  { slug: 'other', name: 'Other', role: 'READ' as const },
]

describe('useAuthStore', () => {
  let store: ReturnType<typeof useAuthStore>

  beforeEach(() => {
    store = useAuthStore()
  })

  describe('setSession', () => {
    it('stores token and user', () => {
      store.setSession('tok123', mockUser)
      expect(store.token).toBe('tok123')
      expect(store.user).toEqual(mockUser)
    })

    it('persists user to localStorage', () => {
      store.setSession('tok123', mockUser)
      expect(JSON.parse(localStorage.getItem('auth_user')!)).toEqual(mockUser)
    })

    it('sets isAuthenticated to true', () => {
      store.setSession('tok123', mockUser)
      expect(store.isAuthenticated).toBe(true)
    })
  })

  describe('logout', () => {
    it('clears token, user, orgs and activeOrgSlug', () => {
      store.setSession('tok123', mockUser)
      store.setOrgs(mockOrgs)
      store.logout()
      expect(store.token).toBeNull()
      expect(store.user).toBeNull()
      expect(store.orgs).toHaveLength(0)
      expect(store.activeOrgSlug).toBeNull()
    })

    it('removes data from localStorage', () => {
      store.setSession('tok123', mockUser)
      store.setOrgs(mockOrgs)
      store.logout()
      expect(localStorage.getItem('auth_user')).toBeNull()
      expect(localStorage.getItem('auth_orgs')).toBeNull()
    })
  })

  describe('setOrgs', () => {
    it('sets orgs list', () => {
      store.setOrgs(mockOrgs)
      expect(store.orgs).toHaveLength(2)
    })

    it('sets activeOrgSlug to first org when none is active', () => {
      store.setOrgs(mockOrgs)
      expect(store.activeOrgSlug).not.toBeNull()
    })

    it('persists orgs to localStorage', () => {
      store.setOrgs(mockOrgs)
      expect(JSON.parse(localStorage.getItem('auth_orgs')!)).toHaveLength(2)
    })
  })

  describe('switchOrg', () => {
    it('updates activeOrgSlug', () => {
      store.setOrgs(mockOrgs)
      store.switchOrg('other')
      expect(store.activeOrgSlug).toBe('other')
    })

    it('persists to localStorage', () => {
      store.switchOrg('alice')
      expect(localStorage.getItem('auth_active_org')).toBe('alice')
    })
  })

  describe('activeOrg', () => {
    it('returns the org matching activeOrgSlug', () => {
      store.setOrgs(mockOrgs)
      store.switchOrg('other')
      expect(store.activeOrg?.slug).toBe('other')
    })

    it('returns first org when activeOrgSlug is not in list', () => {
      store.setOrgs(mockOrgs)
      store.switchOrg('nonexistent')
      expect(store.activeOrg?.slug).toBe('alice')
    })

    it('returns null when no orgs', () => {
      expect(store.activeOrg).toBeNull()
    })
  })

  describe('loadFromStorage', () => {
    it('restores user, orgs, and activeOrg from localStorage', () => {
      localStorage.setItem('auth_user', JSON.stringify(mockUser))
      localStorage.setItem('auth_orgs', JSON.stringify(mockOrgs))
      localStorage.setItem('auth_active_org', 'other')
      store.loadFromStorage()
      expect(store.user).toEqual(mockUser)
      expect(store.orgs).toHaveLength(2)
      expect(store.activeOrgSlug).toBe('other')
    })
  })
})
