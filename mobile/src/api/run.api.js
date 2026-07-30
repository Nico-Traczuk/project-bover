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

export async function saveRun({ class: classKey, gold_earned, rooms_cleared, depth_reached, boss_defeated }) {
  return request('POST', '/runs', { class: classKey, gold_earned, rooms_cleared, depth_reached, boss_defeated })
}

export async function getRunHistory() {
  return request('GET', '/runs/me')
}
