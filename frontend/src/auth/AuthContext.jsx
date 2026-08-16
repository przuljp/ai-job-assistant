import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { AUTH_UNAUTHORIZED_EVENT } from '../api/api.js'

const AuthContext = createContext(null)

function AuthProvider({ children }) {
  const [token, setToken] = useState(() =>
    localStorage.getItem('access_token'),
  )

  const login = useCallback((accessToken) => {
    localStorage.setItem('access_token', accessToken)
    setToken(accessToken)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    setToken(null)
  }, [])

  useEffect(() => {
    function handleUnauthorized() {
      setToken(null)
    }

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)

    return () =>
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [])

  const value = useMemo(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      login,
      logout,
    }),
    [token, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext, AuthProvider }
