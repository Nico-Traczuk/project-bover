import { generateMap, getReachableNodes } from '../src/systems/MapSystem.js'

describe('generateMap', () => {
  test('returns 10 nodes total (8 regular + elite + boss)', () => {
    const { nodes } = generateMap(42)
    expect(nodes.size).toBe(10)
  })

  test('exactly one elite node', () => {
    const { nodes } = generateMap(42)
    const elites = [...nodes.values()].filter(n => n.type === 'elite')
    expect(elites).toHaveLength(1)
  })

  test('exactly one boss node', () => {
    const { nodes } = generateMap(42)
    const bosses = [...nodes.values()].filter(n => n.type === 'boss')
    expect(bosses).toHaveLength(1)
  })

  test('boss is only reachable through elite', () => {
    const { nodes } = generateMap(42)
    const boss = [...nodes.values()].find(n => n.type === 'boss')
    boss.connections.forEach(connId => {
      const conn = nodes.get(connId)
      expect(conn.type).toBe('elite')
    })
  })

  test('start node is at depth 1', () => {
    const { nodes, startNodeId } = generateMap(42)
    expect(nodes.get(startNodeId).depth).toBe(1)
  })

  test('all nodes have id, type, depth, connections', () => {
    const { nodes } = generateMap(42)
    nodes.forEach(node => {
      expect(node.id).toBeTruthy()
      expect(node.type).toBeDefined()
      expect(node.depth).toBeGreaterThan(0)
      expect(Array.isArray(node.connections)).toBe(true)
    })
  })
})

describe('getReachableNodes', () => {
  test('only depth-1 nodes reachable at run start', () => {
    const { nodes, startNodeId } = generateMap(1)
    const reachable = getReachableNodes(nodes, null, new Set())
    expect(reachable.has(startNodeId)).toBe(true)
    // All reachable nodes should be depth 1
    reachable.forEach(id => {
      expect(nodes.get(id).depth).toBe(1)
    })
  })

  test('clearing a node exposes its neighbors', () => {
    const { nodes, startNodeId } = generateMap(1)
    const cleared = new Set([startNodeId])
    const reachable = getReachableNodes(nodes, startNodeId, cleared)
    const startNode = nodes.get(startNodeId)
    startNode.connections.forEach(id => {
      expect(reachable.has(id)).toBe(true)
    })
  })
})
