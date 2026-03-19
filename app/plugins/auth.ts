export default defineNuxtPlugin(async (nuxtApp) => {
    const { isLoggedIn, refresh } = useAuth()
    
    // Check if we are not logged in but might have a refresh token (SSR checks cookies too)
    if (!isLoggedIn.value) {
        try {
            await refresh()
        } catch {
            // It's perfectly fine to fail here (e.g. no token, invalid token), 
            // the global auth middleware will subsequently block/redirect unauthenticated users.
        }
    }
})
