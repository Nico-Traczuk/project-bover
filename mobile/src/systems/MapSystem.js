// No pixi.js import — pure data logic

const NODE_TYPES_BY_DEPTH = {
  1: () => 'combat',
  2: () => 'combat',
  4: (rng) => rng() < 0.7 ? 'combat' : 'chest',
  6: (rng) => { const r = rng(); return r < 0.5 ? 'combat' : r < 0.8 ? 'chest' : 'elite_candidate' },
}

function seededRng(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0x100000000
  }
}

function pickRandom(arr, rng) {
  return arr[Math.floor(rng() * arr.length)]
}

export function generateMap(seed = Date.now()) {
  const rng = seededRng(seed)
  const nodes = new Map()
  let idCounter = 1
  const makeId = () => `node_${idCounter++}`

  // 4 depth layers, 2 nodes each = 8 regular nodes
  const depthMap = { 1: 1, 2: 2, 3: 4, 4: 6 }
  const layerNodes = {}

  for (const layer of [1, 2, 3, 4]) {
    layerNodes[layer] = [makeId(), makeId()]
    layerNodes[layer].forEach(id => {
      const depth = depthMap[layer]
      const typeFn = NODE_TYPES_BY_DEPTH[depth]
      nodes.set(id, {
        id,
        depth,
        type: typeFn ? typeFn(rng) : 'combat',
        connections: [],
        visited: false,
        cleared: false,
      })
    })
  }

  // Elite (depth 7) and boss (depth 8)
  const eliteId = makeId()
  const bossId = makeId()
  nodes.set(eliteId, { id: eliteId, depth: 7, type: 'elite', connections: [bossId], visited: false, cleared: false })
  nodes.set(bossId, { id: bossId, depth: 8, type: 'boss', connections: [], visited: false, cleared: false })

  // Connect layers: ensure each node connects forward and back
  const connectLayers = (fromLayer, toLayer) => {
    const from = layerNodes[fromLayer]
    const to = layerNodes[toLayer]
    // Each from-node connects to at least one to-node
    from.forEach(fid => {
      const target = pickRandom(to, rng)
      if (!nodes.get(fid).connections.includes(target)) nodes.get(fid).connections.push(target)
      if (!nodes.get(target).connections.includes(fid)) nodes.get(target).connections.push(fid)
    })
    // Ensure each to-node has at least one connection back
    to.forEach(tid => {
      if (!nodes.get(tid).connections.some(c => from.includes(c))) {
        const source = pickRandom(from, rng)
        if (!nodes.get(tid).connections.includes(source)) nodes.get(tid).connections.push(source)
        if (!nodes.get(source).connections.includes(tid)) nodes.get(source).connections.push(tid)
      }
    })
  }

  connectLayers(1, 2)
  connectLayers(2, 3)
  connectLayers(3, 4)

  // One random layer-4 node connects to elite (the hidden path)
  const eliteGate = pickRandom(layerNodes[4], rng)
  nodes.get(eliteGate).connections.push(eliteId)
  nodes.get(eliteId).connections.push(eliteGate)

  // Deduplicate all connection arrays
  nodes.forEach(node => {
    node.connections = [...new Set(node.connections)]
  })

  const startNodeId = layerNodes[1][0]
  return { nodes, startNodeId }
}

export function getReachableNodes(nodes, currentNodeId, clearedIds) {
  const reachable = new Set()

  if (!currentNodeId) {
    // Start of run: show all depth-1 nodes
    nodes.forEach((node, id) => {
      if (node.depth === 1) reachable.add(id)
    })
    return reachable
  }

  // Cleared nodes are always reachable (backtracking)
  clearedIds.forEach(id => reachable.add(id))

  // Neighbors of cleared nodes are reachable
  clearedIds.forEach(id => {
    const node = nodes.get(id)
    if (node) node.connections.forEach(connId => reachable.add(connId))
  })

  // Neighbors of current node are reachable
  const current = nodes.get(currentNodeId)
  if (current) current.connections.forEach(connId => reachable.add(connId))

  return reachable
}
