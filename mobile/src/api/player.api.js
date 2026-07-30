import { authState } from '../core/AuthState.js'

const BASE = 'http://localhost:3000/api'

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  if (authState.token) headers['Authorization'] = `Bearer ${authState.token}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error?.message || 'Request failed')
  return json.data
}

export async function register(username, email, password) {
  return request('POST', '/auth/register', { username, email, password })
}

export async function login(email, password) {
  return request('POST', '/auth/login', { email, password })
}

export async function getProfile() {
  return request('GET', '/players/me')
}

export async function purchaseMeta(upgradeKey) {
  return request('POST', '/meta-upgrades', { upgrade_key: upgradeKey })
}
