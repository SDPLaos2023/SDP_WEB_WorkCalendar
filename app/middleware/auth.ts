export default defineNuxtRouteMiddleware((to) => {
  const { isLoggedIn } = useAuth()

  if (!isLoggedIn.value && to.path !== '/login') {
    return navigateTo('/login')
  }

  if (to.meta.roles) {
    const allowedRoles = to.meta.roles as string[]
    const { user } = useAuth()
    if (!user.value || !allowedRoles.includes(user.value.role)) {
      return navigateTo('/dashboard')
    }
  }
})
