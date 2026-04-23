// ufo's parseQuery uses Object.create(null) for prototype-pollution safety, so
// ssrContext.payload.error on /__nuxt_error requests is a null-proto object.
// pinia's shouldHydrate calls obj.hasOwnProperty() which fails on null-proto objects,
// crashing payload serialization. Normalize it here before devalue runs.
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:rendered', ({ ssrContext }) => {
    const err = ssrContext?.payload?.error
    if (err && Object.getPrototypeOf(err) === null) {
      ssrContext.payload.error = Object.assign({}, err)
    }
  })
})
