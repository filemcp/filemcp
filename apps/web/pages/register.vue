<script setup lang="ts">
definePageMeta({ middleware: 'guest' })

const route = useRoute()
const auth = useAuthStore()
const email = ref((route.query.prefill_email as string) ?? '')
const username = ref('')
const password = ref('')
const orgName = ref('')
const orgNameEdited = ref(false)
const loading = ref(false)
const { fieldErrors, topError, setFromException, clearField, reset } = useFormErrors()

const inputBase = 'w-full px-4 py-3 bg-zinc-900 text-white rounded-lg border focus:outline-none transition'
const inputOk = 'border-zinc-800 focus:border-cyan-500 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.14)]'
const inputErr = 'border-red-500/70 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.18)]'

watch(username, (val) => {
  if (!orgNameEdited.value) orgName.value = val
})

const orgSlugPreview = computed(() =>
  (orgName.value || username.value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48),
)

async function submit() {
  reset()
  loading.value = true
  try {
    const config = useRuntimeConfig()
    const res = await $fetch<{ accessToken: string; user: any }>(
      `${config.public.apiUrl}/auth/register`,
      {
        method: 'POST',
        body: {
          email: email.value,
          username: username.value,
          password: password.value,
          orgName: orgName.value.trim() || undefined,
        },
      },
    )
    auth.setSession(res.accessToken, res.user)
    await navigateTo('/dashboard')
  } catch (e: any) {
    setFromException(e, 'Registration failed')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
    <div class="w-full max-w-sm space-y-6">
      <div class="flex justify-center">
        <NuxtLink to="/" class="inline-block select-none">
          <img src="/logo.png" alt="FileMCP" class="h-8 w-auto" />
        </NuxtLink>
      </div>
      <h1 class="text-2xl font-bold text-white text-center">Create account</h1>
      <form class="space-y-4" @submit.prevent="submit">
        <div>
          <input
            v-model="email"
            type="email"
            placeholder="Email"
            :class="[inputBase, fieldErrors.email ? inputErr : inputOk]"
            @input="clearField('email')"
          />
          <p v-if="fieldErrors.email" class="text-red-400 text-xs mt-1.5 px-1">{{ fieldErrors.email[0] }}</p>
        </div>
        <div>
          <input
            v-model="username"
            type="text"
            placeholder="Username"
            :class="[inputBase, fieldErrors.username ? inputErr : inputOk]"
            @input="clearField('username')"
          />
          <p v-if="fieldErrors.username" class="text-red-400 text-xs mt-1.5 px-1">{{ fieldErrors.username[0] }}</p>
        </div>
        <div class="space-y-1">
          <input
            v-model="orgName"
            type="text"
            placeholder="Workspace name"
            :class="[inputBase, fieldErrors.orgName ? inputErr : inputOk]"
            @input="orgNameEdited = true; clearField('orgName')"
          />
          <p v-if="fieldErrors.orgName" class="text-red-400 text-xs mt-1.5 px-1">{{ fieldErrors.orgName[0] }}</p>
          <p v-else class="text-xs text-zinc-600 px-1">
            Your assets will live at
            <span class="text-zinc-400 font-mono">filemcp.com/u/{{ orgSlugPreview || '…' }}/</span>
          </p>
        </div>
        <div>
          <input
            v-model="password"
            type="password"
            placeholder="Password (8+ chars)"
            :class="[inputBase, fieldErrors.password ? inputErr : inputOk]"
            @input="clearField('password')"
          />
          <p v-if="fieldErrors.password" class="text-red-400 text-xs mt-1.5 px-1">{{ fieldErrors.password[0] }}</p>
        </div>
        <p v-if="topError" class="text-red-400 text-sm">{{ topError }}</p>
        <p class="text-xs text-zinc-500 text-center leading-relaxed px-2">
          By creating an account, you agree to our
          <NuxtLink to="/terms" class="text-zinc-300 hover:text-cyan-300 underline-offset-2 hover:underline transition">Terms of Use</NuxtLink>
          and acknowledge our
          <NuxtLink to="/privacy" class="text-zinc-300 hover:text-cyan-300 underline-offset-2 hover:underline transition">Privacy Policy</NuxtLink>.
        </p>
        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3 bg-white text-zinc-950 rounded-lg font-semibold hover:bg-zinc-100 hover:shadow-[0_0_30px_rgba(34,211,238,0.45)] transition disabled:opacity-50"
        >
          {{ loading ? 'Creating account…' : 'Create account' }}
        </button>
      </form>
      <p class="text-zinc-500 text-sm text-center">
        Already have an account?
        <NuxtLink to="/login" class="text-zinc-300 hover:text-white">Sign in</NuxtLink>
      </p>
    </div>
  </div>
</template>
