const TOKEN_KEY = 'pb_token'

class AuthState {
  constructor() {
    this.token = null
    this.player = null // { id, username, gold, meta_upgrades }
  }

  setAuth(token, player) {
    this.token = token
    this.player = player
    localStorage.setItem(TOKEN_KEY, token)
  }

  loadFromStorage() {
    this.token = localStorage.getItem(TOKEN_KEY)
  }

  clear() {
    this.token = null
    this.player = null
    localStorage.removeItem(TOKEN_KEY)
  }

  isLoggedIn() {
    return !!this.token
  }
}

export const authState = new AuthState()
