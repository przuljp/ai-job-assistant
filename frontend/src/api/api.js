import axios from 'axios'

const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (requestError) => {
    if (requestError.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT))
    }

    return Promise.reject(requestError)
  },
)

export { AUTH_UNAUTHORIZED_EVENT }
export default api
