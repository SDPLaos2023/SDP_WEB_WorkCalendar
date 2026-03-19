declare module '#auth-utils' {
    interface User {
        id: number
        email: string
        name: string
        avatar?: string
        role: string
    }

    interface UserSession {
        // Add custom session data here if needed
    }
}

export { }
