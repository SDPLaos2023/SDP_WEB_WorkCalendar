import { describe, it, expect } from 'vitest'
import { decryptPassword, hashPassword, comparePassword } from '../../../server/utils/crypto'
import { encryptPassword } from '../../../app/utils/crypto'
import { beforeAll } from 'vitest'

describe('Crypto Utilities', () => {
    beforeAll(() => {
        // Mock secret key for consistent encryption/decryption between app and server utils
        process.env.SECRET_KEY = 'your-secret-key-replace-this'
    })

    const rawPassword = 'my-secret-password-123'

    it('should encrypt and decrypt correctly', () => {
        const encrypted = encryptPassword(rawPassword)
        expect(encrypted).not.toBe(rawPassword)

        const decrypted = decryptPassword(encrypted)
        expect(decrypted).toBe(rawPassword)
    })

    it('should hash and compare passwords correctly', async () => {
        const hash = await hashPassword(rawPassword)
        expect(hash).not.toBe(rawPassword)

        const isMatch = await comparePassword(rawPassword, hash)
        expect(isMatch).toBe(true)

        const isNotMatch = await comparePassword('wrong-password', hash)
        expect(isNotMatch).toBe(false)
    })

    it('should throw error on invalid decryption', () => {
        expect(() => decryptPassword('invalid-encrypted-string')).toThrow()
    })
})
