// Parses NestJS class-validator errors into per-field messages.
// class-validator messages start with the field name (e.g. "password must be longer than..."),
// which we use to route them to the right field. Anything we can't route falls into topError.
export function useFormErrors() {
  const fieldErrors = ref<Record<string, string[]>>({})
  const topError = ref('')

  function setFromException(e: any, fallback = 'Something went wrong') {
    fieldErrors.value = {}
    topError.value = ''

    const msg = e?.data?.message
    if (Array.isArray(msg)) {
      for (const m of msg) {
        if (typeof m !== 'string') continue
        const match = m.match(/^(\w+)\s/)
        if (match) {
          const field = match[1]
          ;(fieldErrors.value[field] ??= []).push(m)
        } else {
          topError.value = topError.value ? `${topError.value}\n${m}` : m
        }
      }
      if (!topError.value && Object.keys(fieldErrors.value).length === 0) {
        topError.value = fallback
      }
    } else if (typeof msg === 'string') {
      topError.value = msg
    } else {
      topError.value = fallback
    }
  }

  function clearField(field: string) {
    if (fieldErrors.value[field]) {
      const { [field]: _omit, ...rest } = fieldErrors.value
      fieldErrors.value = rest
    }
  }

  function reset() {
    fieldErrors.value = {}
    topError.value = ''
  }

  return { fieldErrors, topError, setFromException, clearField, reset }
}
