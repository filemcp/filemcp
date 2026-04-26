<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'dashboard' })

const auth = useAuthStore()
const orgSlug = computed(() => auth.activeOrg?.slug ?? null)

const { data: org, refresh } = useApi<{
  id: string
  slug: string
  name: string
  description: string | null
  members: Array<{
    id: string
    role: 'OWNER' | 'WRITE' | 'READ'
    joinedAt: string
    user: { id: string; username: string; email: string }
  }>
  assetCount: number
  assetLimit: number
  assetLimitBase: number
  assetLimitPerMember: number
}>(computed(() => orgSlug.value ? `/orgs/${orgSlug.value}` : null))

const inviteInput = ref('')
const inviteRole = ref<'WRITE' | 'READ'>('WRITE')
const inviteError = ref('')
const inviting = ref(false)

const currentUserId = computed(() => auth.user?.id ?? '')
const isOwner = computed(() =>
  org.value?.members.find((m) => m.user.id === currentUserId.value)?.role === 'OWNER',
)

async function invite() {
  if (!inviteInput.value.trim()) return
  inviteError.value = ''
  inviting.value = true
  try {
    await $api(`/orgs/${orgSlug.value}/members`, {
      method: 'POST',
      body: JSON.stringify({ usernameOrEmail: inviteInput.value.trim(), role: inviteRole.value }),
      headers: { 'Content-Type': 'application/json' },
    })
    inviteInput.value = ''
    refresh()
  } catch (e: any) {
    const msg = e?.data?.message ?? ''
    inviteError.value = msg.toLowerCase().includes('not found')
      ? 'No account found with that username or email. They need to sign up first.'
      : msg || 'Failed to invite member'
  } finally {
    inviting.value = false
  }
}

async function changeRole(userId: string, role: string) {
  await $api(`/orgs/${orgSlug.value}/members/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
    headers: { 'Content-Type': 'application/json' },
  })
  refresh()
}

async function removeMember(userId: string) {
  if (!confirm('Remove this member from the org?')) return
  await $api(`/orgs/${orgSlug.value}/members/${userId}`, { method: 'DELETE' })
  refresh()
}

const ROLE_LABELS: Record<string, string> = { OWNER: 'Owner', WRITE: 'Write', READ: 'Read' }
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-8 space-y-8">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold">Members</h1>
        <span class="text-zinc-500 text-sm font-mono">{{ orgSlug }}</span>
      </div>

      <!-- Asset limit info -->
      <div v-if="org" class="bg-zinc-900 rounded-xl px-5 py-4 border border-zinc-800 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-zinc-200">Assets</span>
          <span class="text-sm text-zinc-400">{{ org.assetCount }} of {{ org.assetLimit }} used</span>
        </div>
        <div class="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all"
            :class="org.assetCount >= org.assetLimit ? 'bg-red-500' : 'bg-cyan-500'"
            :style="{ width: `${Math.min((org.assetCount / org.assetLimit) * 100, 100)}%` }"
          />
        </div>
        <p class="text-xs text-zinc-500">
          Each invited member adds {{ org.assetLimitPerMember }} slots. You have {{ org.assetLimit }} total ({{ org.assetLimitBase }} base{{ org.members.length > 1 ? ` + ${org.assetLimitPerMember} × ${org.members.length - 1} invited` : '' }}).
        </p>
      </div>

      <!-- Invite form (owners only) -->
      <div v-if="isOwner" class="space-y-3">
        <h2 class="font-semibold">Invite member</h2>
        <div class="flex gap-2">
          <input
            v-model="inviteInput"
            placeholder="Username or email"
            class="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-lg border border-zinc-800 focus:outline-none focus:border-cyan-500 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.14)] text-sm"
            @keydown.enter="invite"
          />
          <select
            v-model="inviteRole"
            class="px-3 py-2 bg-zinc-900 text-white rounded-lg border border-zinc-800 text-sm focus:outline-none focus:border-cyan-500 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.14)]"
          >
            <option value="WRITE">Write</option>
            <option value="READ">Read</option>
          </select>
          <button
            :disabled="inviting"
            class="px-4 py-2 bg-white text-zinc-950 rounded-lg text-sm font-semibold hover:bg-zinc-100 hover:shadow-[0_0_24px_rgba(34,211,238,0.4)] transition disabled:opacity-50"
            @click="invite"
          >
            Invite
          </button>
        </div>
        <p v-if="inviteError" class="text-red-400 text-sm">{{ inviteError }}</p>
      </div>

      <!-- Member list -->
      <div class="space-y-3">
        <h2 class="font-semibold">Current members</h2>
        <div v-if="!org?.members?.length" class="text-zinc-500 text-sm">No members yet.</div>
        <div
          v-for="member in org?.members"
          :key="member.id"
          class="flex items-center justify-between bg-zinc-900 rounded-lg px-4 py-3"
        >
          <div class="space-y-0.5">
            <p class="text-sm font-medium">{{ member.user.username }}</p>
            <p class="text-xs text-zinc-500">{{ member.user.email }}</p>
          </div>
          <div class="flex items-center gap-3">
            <!-- Role selector (owners can change non-owner roles) -->
            <select
              v-if="isOwner && member.user.id !== currentUserId && member.role !== 'OWNER'"
              :value="member.role"
              class="px-2 py-1 bg-zinc-800 text-white rounded text-xs border border-zinc-700 focus:outline-none"
              @change="changeRole(member.user.id, ($event.target as HTMLSelectElement).value)"
            >
              <option value="WRITE">Write</option>
              <option value="READ">Read</option>
            </select>
            <span v-else class="text-xs text-zinc-400">{{ ROLE_LABELS[member.role] }}</span>

            <!-- Remove button (owners can remove non-owners) -->
            <button
              v-if="isOwner && member.user.id !== currentUserId"
              class="text-xs text-red-500 hover:text-red-400 transition"
              @click="removeMember(member.user.id)"
            >
              Remove
            </button>
            <span v-else-if="member.user.id === currentUserId" class="text-xs text-zinc-600">you</span>
          </div>
        </div>
    </div>
  </div>
</template>
