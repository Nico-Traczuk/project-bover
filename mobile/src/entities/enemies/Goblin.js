import { BaseEnemy } from './BaseEnemy.js'

export class Goblin extends BaseEnemy {
  constructor(depth = 1) {
    super('goblin', depth)
  }
}
