import type { Role } from '~~/shared/schemas/user.schema'

export interface User {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  role: Role
  companyId: string
  departmentId?: string | null
  isActive: boolean
}

export interface AuthResponse {
  success: boolean
  data: {
    accessToken: string
    user: User
  }
}

export const useAuth = () => {
  const token = useState<string | null>('token', () => null)
  const user = useState<User | null>('user', () => null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isLoggedIn = computed(() => !!token.value)
  const userRole = computed(() => user.value?.role)

  const hasRole = (roles: Role[]) => {
    return computed(() => user.value ? roles.includes(user.value.role) : false)
  }

  const login = async (username: string, password: string) => {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: { username, password }
      })
      if (response.success) {
        token.value = response.data.accessToken
        user.value = response.data.user
      }
    } catch (err: any) {
      error.value = err.data?.statusMessage || 'Login failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    loading.value = true
    try {
      if (token.value) {
        await $fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token.value}`
          }
        })
      }
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      token.value = null
      user.value = null
      loading.value = false
      navigateTo('/login')
    }
  }

  const refresh = async () => {
    try {
      const response = await $fetch<any>('/api/auth/refresh', {
        method: 'POST',
        headers: useRequestHeaders(['cookie'])
      })
      if (response.success) {
        token.value = response.data.accessToken
        user.value = response.data.user
      }
    } catch (err) {
      token.value = null
      user.value = null
      throw err
    }
  }

  const apiFetch = async <T>(url: string, options: any = {}): Promise<T> => {
    try {
      return await $fetch<any>(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: token.value ? `Bearer ${token.value}` : ''
        }
      }) as T
    } catch (err: any) {
      if (err.statusCode === 401) {
        await refresh()
        // Retry the call with the new token
        return await $fetch<any>(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: token.value ? `Bearer ${token.value}` : ''
          }
        }) as T
      }
      throw err
    }
  }

  return {
    token,
    user,
    loading,
    error,
    isLoggedIn,
    role: userRole,
    hasRole,
    login,
    logout,
    refresh,
    apiFetch
  }
}
