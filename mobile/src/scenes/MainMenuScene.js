import { Container, Graphics, Text, NineSliceSprite, Sprite, Assets } from 'pixi.js'
import { sceneManager } from '../core/SceneManager.js'
import { authState } from '../core/AuthState.js'

function makePanel(w, h, fillTint, borderTint) {
  const c = new Container()
  const fillTex = Assets.get('ui_panel_fill')
  const borderTex = Assets.get('ui_panel_border')
  if (fillTex) {
    const fill = new NineSliceSprite({ texture: fillTex, leftWidth: 12, topHeight: 12, rightWidth: 12, bottomHeight: 12 })
    fill.width = w; fill.height = h; fill.tint = fillTint
    c.addChild(fill)
  }
  if (borderTex) {
    const border = new NineSliceSprite({ texture: borderTex, leftWidth: 12, topHeight: 12, rightWidth: 12, bottomHeight: 12 })
    border.width = w; border.height = h; border.tint = borderTint
    c.addChild(border)
  }
  return c
}

function makePanelButton(label, w, h, fillTint, onClick) {
  const c = makePanel(w, h, fillTint, 0xC8A857)
  const t = new Text({ text: label, style: { fill: 0xF5DEB3, fontSize: 20, fontWeight: 'bold' } })
  t.anchor.set(0.5)
  t.x = w / 2
  t.y = h / 2
  c.addChild(t)
  c.eventMode = 'static'
  c.cursor = 'pointer'
  c.on('pointerup', onClick)
  return c
}

export class MainMenuScene extends Container {
  constructor() {
    super()

    const bg = new Graphics()
    bg.rect(0, 0, 450, 800).fill(0x0f172a)
    this.addChild(bg)

    // Decorative horizontal lines top and bottom
    const topLine = new Graphics()
    topLine.rect(0, 70, 450, 2).fill({ color: 0xC8A857, alpha: 0.3 })
    this.addChild(topLine)
    const botLine = new Graphics()
    botLine.rect(0, 728, 450, 2).fill({ color: 0xC8A857, alpha: 0.3 })
    this.addChild(botLine)

    // Title panel
    const titlePanel = makePanel(380, 74, 0x080e1a, 0xC8A857)
    titlePanel.x = 35
    titlePanel.y = 150
    this.addChild(titlePanel)

    const title = new Text({ text: 'PROJECTO BOVER', style: { fill: 0xF59E0B, fontSize: 32, fontWeight: 'bold' } })
    title.anchor.set(0.5)
    title.x = 225
    title.y = 187
    this.addChild(title)

    // Divider under title
    const divTex = Assets.get('ui_divider')
    if (divTex) {
      const div = new Sprite(divTex)
      div.width = 240; div.height = 10
      div.x = 105; div.y = 238
      div.tint = 0xC8A857
      this.addChild(div)
    }

    const sub = new Text({ text: 'A Medieval Roguelite', style: { fill: 0x94A3B8, fontSize: 16 } })
    sub.anchor.set(0.5)
    sub.x = 225
    sub.y = 260
    this.addChild(sub)

    this._buildButtons()

    if (authState.player) {
      const gold = new Text({
        text: `Welcome, ${authState.player.username ?? 'Hero'}  ·  Gold: ${authState.player.gold}`,
        style: { fill: 0xF59E0B, fontSize: 14 },
      })
      gold.anchor.set(0.5)
      gold.x = 225
      gold.y = 752
      this.addChild(gold)
    }
  }

  _buildButtons() {
    const playBtn = makePanelButton('▶   PLAY', 220, 60, 0x0a1f0a, () => this._goPlay())
    playBtn.x = 115
    playBtn.y = 320
    this.addChild(playBtn)

    if (!authState.player) {
      const loginBtn = makePanelButton('LOGIN', 180, 44, 0x0f172a, () => this._showLogin())
      loginBtn.x = 20
      loginBtn.y = 430
      this.addChild(loginBtn)

      const regBtn = makePanelButton('REGISTER', 180, 44, 0x0f172a, () => this._showRegister())
      regBtn.x = 250
      regBtn.y = 430
      this.addChild(regBtn)
    } else {
      const logoutBtn = new Text({ text: 'Logout', style: { fill: 0x6B7280, fontSize: 14 } })
      logoutBtn.anchor.set(0.5)
      logoutBtn.x = 225
      logoutBtn.y = 430
      logoutBtn.eventMode = 'static'
      logoutBtn.cursor = 'pointer'
      logoutBtn.on('pointerup', () => this._logout())
      this.addChild(logoutBtn)
    }
  }

  _goPlay() {
    import('./ClassSelectScene.js').then(({ ClassSelectScene }) => {
      sceneManager.go(new ClassSelectScene())
    }).catch(err => console.error('Failed to load ClassSelectScene:', err))
  }

  _logout() {
    authState.clear()
    sceneManager.go(new MainMenuScene())
  }

  _showLogin() {
    this._showAuthForm('LOGIN', async (email, password) => {
      const { login, getProfile } = await import('../api/player.api.js')
      const data = await login(email, password)
      authState.setAuth(data.token, data.player)
      const profile = await getProfile()
      authState.player = profile
      sceneManager.go(new MainMenuScene())
    })
  }

  _showRegister() {
    this._showAuthForm('REGISTER', async (email, password, username) => {
      const { register, getProfile } = await import('../api/player.api.js')
      const data = await register(username, email, password)
      authState.setAuth(data.token, data.player)
      const profile = await getProfile()
      authState.player = profile
      sceneManager.go(new MainMenuScene())
    })
  }

  _showAuthForm(mode, onSubmit) {
    const form = document.createElement('div')
    form.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1f2937;padding:32px;border-radius:8px;z-index:10;display:flex;flex-direction:column;gap:12px;min-width:280px;border:1px solid #C8A857'
    const isRegister = mode === 'REGISTER'
    form.innerHTML = `
      <h2 style="color:#F5DEB3;margin:0;font-family:sans-serif">${mode}</h2>
      ${isRegister ? '<input id="pb-username" placeholder="Username" style="padding:8px;border-radius:4px;border:1px solid #374151;background:#111827;color:#fff"/>' : ''}
      <input id="pb-email" type="email" placeholder="Email" style="padding:8px;border-radius:4px;border:1px solid #374151;background:#111827;color:#fff"/>
      <input id="pb-password" type="password" placeholder="Password" style="padding:8px;border-radius:4px;border:1px solid #374151;background:#111827;color:#fff"/>
      <p id="pb-error" style="color:#EF4444;margin:0;font-size:14px;font-family:sans-serif"></p>
      <button id="pb-submit" style="padding:10px;background:#1D4ED8;color:#F5DEB3;border:1px solid #C8A857;border-radius:4px;cursor:pointer;font-size:15px">${mode}</button>
      <button id="pb-cancel" style="padding:8px;background:#374151;color:#9CA3AF;border:none;border-radius:4px;cursor:pointer">Cancel</button>
    `
    document.body.appendChild(form)
    document.getElementById('pb-cancel').onclick = () => document.body.removeChild(form)
    document.getElementById('pb-submit').onclick = async () => {
      const email = document.getElementById('pb-email').value
      const password = document.getElementById('pb-password').value
      const username = isRegister ? document.getElementById('pb-username').value : undefined
      try {
        await onSubmit(email, password, username)
        document.body.removeChild(form)
      } catch (err) {
        document.getElementById('pb-error').textContent = err.message
      }
    }
  }
}
