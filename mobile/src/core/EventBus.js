class EventBus {
  constructor() {
    this._listeners = {}
  }

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = []
    this._listeners[event].push(fn)
  }

  off(event, fn) {
    if (!this._listeners[event]) return
    this._listeners[event] = this._listeners[event].filter(l => l !== fn)
  }

  emit(event, data) {
    if (!this._listeners[event]) return
    this._listeners[event].forEach(fn => fn(data))
  }
}

export const eventBus = new EventBus()
