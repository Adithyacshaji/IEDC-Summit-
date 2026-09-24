import { calculateHaversineDistance } from '../utils/haversine';

/**
 * Converts array of DB nodes [{id, latitude, longitude, ...}] to a lookup map { [id]: [lat, lng] }
 */
export function buildNodeMap(dbNodes = []) {
  const map = {};
  dbNodes.forEach(node => {
    if (node && node.id && node.latitude !== undefined && node.longitude !== undefined) {
      const lat = parseFloat(node.latitude);
      const lng = parseFloat(node.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        map[node.id] = [lat, lng];
      }
    }
  });
  return map;
}

/**
 * Finds the nearest outdoor node ID to a given lat/lng from dynamic nodeMap.
 */
export function findNearestOutdoorNode(lat, lng, nodeMap = {}) {
  let nearest = null;
  let minDistance = Infinity;

  for (const [id, coord] of Object.entries(nodeMap)) {
    if (!coord || coord.length < 2) continue;
    const dist = calculateHaversineDistance(lat, lng, coord[0], coord[1]);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = id;
    }
  }
  return nearest;
}

/**
 * Finds the optimal outdoor path using A* algorithm with dynamic nodeMap and dbEdges.
 * Protected against infinite loops and cyclic paths.
 */
export function findOutdoorPath(startNodeId, destinationNodeId, nodeMap = {}, dbEdges = []) {
  if (!startNodeId || !destinationNodeId || !nodeMap[startNodeId] || !nodeMap[destinationNodeId]) {
    return [];
  }

  if (startNodeId === destinationNodeId) {
    return [startNodeId];
  }

  // Build adjacency list graph from dbEdges
  const graph = {};
  for (const edge of dbEdges) {
    let a, b;
    if (Array.isArray(edge)) {
      [a, b] = edge;
    } else if (edge && (edge.start_node || edge.node_a) && (edge.end_node || edge.node_b)) {
      a = edge.start_node || edge.node_a;
      b = edge.end_node || edge.node_b;
    } else {
      continue;
    }

    if (!graph[a]) graph[a] = [];
    if (!graph[b]) graph[b] = [];

    const nodeA = nodeMap[a];
    const nodeB = nodeMap[b];

    if (nodeA && nodeB) {
      const dist = calculateHaversineDistance(nodeA[0], nodeA[1], nodeB[0], nodeB[1]);
      graph[a].push({ node: b, weight: dist });
      graph[b].push({ node: a, weight: dist });
    }
  }

  const openSet = new Set([startNodeId]);
  const closedSet = new Set();
  const gScore = { [startNodeId]: 0 };
  const fScore = { [startNodeId]: heuristic(startNodeId, destinationNodeId, nodeMap) };
  const cameFrom = {};

  let iterations = 0;
  const maxIterations = 2000;

  while (openSet.size > 0 && iterations < maxIterations) {
    iterations++;

    let current = null;
    let minF = Infinity;
    for (const node of openSet) {
      const score = fScore[node];
      if (score !== undefined && !isNaN(score) && score < minF) {
        minF = score;
        current = node;
      }
    }

    if (!current) {
      break;
    }

    if (current === destinationNodeId) {
      return reconstructPath(cameFrom, current);
    }

    openSet.delete(current);
    closedSet.add(current);

    const neighbors = graph[current] || [];
    for (const neighbor of neighbors) {
      if (closedSet.has(neighbor.node)) continue;

      const tentativeGScore = (gScore[current] || 0) + neighbor.weight;

      if (!openSet.has(neighbor.node)) {
        openSet.add(neighbor.node);
      } else if (tentativeGScore >= (gScore[neighbor.node] ?? Infinity)) {
        continue;
      }

      cameFrom[neighbor.node] = current;
      gScore[neighbor.node] = tentativeGScore;
      fScore[neighbor.node] = tentativeGScore + heuristic(neighbor.node, destinationNodeId, nodeMap);
    }
  }

  return [];
}

function heuristic(nodeAId, nodeBId, nodeMap) {
  const nodeA = nodeMap[nodeAId];
  const nodeB = nodeMap[nodeBId];
  if (!nodeA || !nodeB) return 0;
  return calculateHaversineDistance(nodeA[0], nodeA[1], nodeB[0], nodeB[1]);
}

function reconstructPath(cameFrom, current) {
  const path = [current];
  const visited = new Set([current]);

  while (cameFrom[current] && !visited.has(cameFrom[current])) {
    current = cameFrom[current];
    visited.add(current);
    path.unshift(current);
  }
  return path;
}
