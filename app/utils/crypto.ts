import CryptoJS from 'crypto-js'

const SECRET_KEY = 'your-secret-key-replace-this' // In real app, get from runtimeConfig or env

export const encryptPassword = (password: string): string => {
    return CryptoJS.AES.encrypt(password, SECRET_KEY).toString()
}

export const decryptPassword = (encrypted: string): string => {
    const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY)
    return bytes.toString(CryptoJS.enc.Utf8)
}
