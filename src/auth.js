import { useState, useEffect } from 'react'
import { API } from './api'

export function useAuth() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      setUser({ token }) 
    }
  }, [])

  async function login(credentials) {
    try {
      const res = await API.post('/auth/login/', credentials)
      localStorage.setItem('access_token', res.data.access)
      setUser({ token: res.data.access })
      return true
    } catch {
      return false
    }
  }

  async function signup(data) {
    try {
      const res = await API.post('/auth/register/', data)
      localStorage.setItem('access_token', res.data.access)
      setUser({ token: res.data.access })
      return true
    } catch {
      return false
    }
  }

  function logout() {
    localStorage.removeItem('access_token')
    setUser(null)
  }

  return { user, login, logout, signup }
}
