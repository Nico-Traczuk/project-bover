export const runState = {
  selectedClass: null,
  goldEarned: 0,
  roomsCleared: 0,
  depthReached: 0,
  bossDefeated: false,
  _mapData: null,
  _clearedNodeIds: [],
  _currentNodeId: null,
  _upgradeSystem: null,

  reset() {
    this.selectedClass = null
    this.goldEarned = 0
    this.roomsCleared = 0
    this.depthReached = 0
    this.bossDefeated = false
    this._mapData = null
    this._clearedNodeIds = []
    this._currentNodeId = null
    this._upgradeSystem = null
  },

  addGold(amount) {
    this.goldEarned += amount
  },
}
