export default defineNuxtRouteMiddleware((to) => {
  const { isLoggedIn, user } = useAuth()
  
  if (import.meta.client) {
    console.log('[Auth Middleware] to:', to.path, 'isLoggedIn:', isLoggedIn.value)
  }

  // Exempt /login and / public paths
  if (to.path === '/login') {
    if (isLoggedIn.value) {
      return navigateTo('/dashboard')
    }
    return
  }

  if (!isLoggedIn.value) {
    console.log('[Auth Middleware] Redirecting to /login')
    return navigateTo('/login')
  }

  // Role-based protection
  if (to.meta.roles) {
    const allowedRoles = to.meta.roles as string[]
    const userRole = user.value?.role || ''
    if (!allowedRoles.includes(userRole)) {
      console.log('[Auth Middleware] Forbidden - Redirecting to dashboard')
      return navigateTo('/dashboard')
    }
  }
})
