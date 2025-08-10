'use client'
import { useRef, useEffect } from 'react'
import Node from './Node'
import * as d3 from 'd3'

export default function AttributionGraph({ 
  selectedIdx, 
  chunksData, 
  selectedPaths,
  treeDirection = 'incoming',
  causalLinksCount = 3,
  maxDepth = 2,
  onNodeHover,
  onNodeLeave,
  onNodeClick,
  hoveredNode = null
}) {
  // Node dimensions - mobile responsive
  const nodeW = window.innerWidth <= 650 ? 80 : 110
  const nodeH = window.innerWidth <= 650 ? 40 : 70
  const levelGapY = window.innerWidth <= 650 ? 90 : 120  // Vertical spacing between levels - smaller on mobile
  const nodeGapX = window.innerWidth <= 650 ? 110 : 150  // Horizontal spacing between nodes at same level - smaller on mobile

  
  // Create ref for container and zoom
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const zoomRef = useRef(null)

  // useEffect for scrolling - moved before conditional return
  useEffect(() => {
    if (containerRef.current && selectedPaths.length > 0) {
      const container = containerRef.current
      const height = Math.max(600, 800) // Use a reasonable default height
      const scrollTop = Math.max(0, (height - container.clientHeight) / 2)
      container.scrollTop = scrollTop
    }
  }, [selectedIdx, selectedPaths])

  // Add reset function that can be called from parent
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.resetAttributionGraphView = () => {
        if (svgRef.current && zoomRef.current) {
          const svg = d3.select(svgRef.current)
          svg.transition().duration(350).call(zoomRef.current.transform, d3.zoomIdentity)
        }
      }
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.resetAttributionGraphView = null
      }
    }
  }, [])

  // Initialize zoom behavior
  useEffect(() => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current)
      
      // Create zoom behavior
      const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          svg.select('.zoom-group').attr('transform', event.transform)
        })
      
      // Apply zoom behavior to SVG
      svg.call(zoom)
      zoomRef.current = zoom
    }
  }, [selectedPaths]) // Re-initialize when paths change

  // Build tree layout with selected node at bottom
  const buildTreeLayout = (paths, maxNodes = 50, causalLinksCount = 3, maxDepth = 2) => {
    const allNodes = new Map()
    const nodesByLevel = new Map()
    
    // First, collect all unique nodes from paths
    paths.forEach(path => {
      path.forEach(node => {
        if (node && node.idx !== undefined) {
          allNodes.set(node.idx, node)
        }
      })
    })
    
    // Filter to most important nodes if we have too many
    const nodeImportanceMap = new Map()
    Array.from(allNodes.values()).forEach(node => {
      if (!node || node.idx === undefined) return
      
      // Handle both sources and targets for importance calculation
      const connections = node?.sources || node?.targets || []
      const totalImportance = connections.reduce((sum, connection) => {
        return sum + (connection && connection.score ? connection.score : 0)
      }, 0)
      nodeImportanceMap.set(node?.idx, totalImportance)
    })
    
    const sortedNodesByImportance = Array.from(allNodes.keys())
      .filter(nodeIdx => nodeIdx !== selectedIdx && nodeIdx !== undefined)
      .sort((a, b) => (nodeImportanceMap.get(b) || 0) - (nodeImportanceMap.get(a) || 0))
      .slice(0, maxNodes - 1)
    
    sortedNodesByImportance.push(selectedIdx) // Always include target
    
    // Filter nodes - but be more permissive for higher depths
    const filteredNodes = new Map()
    sortedNodesByImportance.forEach(nodeIdx => {
      if (allNodes.has(nodeIdx)) {
        const node = allNodes.get(nodeIdx)
        if (!node) return
        
        // Don't filter connections too aggressively - keep all connections for tree building
        const filteredNode = { ...node }
        filteredNodes.set(nodeIdx, filteredNode)
      }
    })
    
    // Build tree levels: selected node at bottom (level 0)
    const selectedNode = filteredNodes.get(selectedIdx)
    if (!selectedNode) return nodesByLevel
    
    nodesByLevel.set(0, [selectedNode])
    
    // Dynamically build levels based on maxDepth
    for (let level = 1; level <= maxDepth; level++) {
      const currentLevelNodes = []
      const currentLevelNodeIds = new Set()
      const previousLevel = nodesByLevel.get(level - 1)
      
      if (!previousLevel || previousLevel.length === 0) {
        break // No more nodes to build from
      }
      
      previousLevel.forEach(node => {
        if (!node || !node.idx) return // Skip undefined/invalid nodes
        
        const connections = node.sources || node.targets || []
        if (connections.length > 0) {
          // Sort connections by normalized score and take top-N based on causalLinksCount
          const topConnections = connections
            .sort((a, b) => b.score - a.score) // Sort by normalized score descending
            .slice(0, causalLinksCount) // Use causalLinksCount parameter
          
          topConnections.forEach(connection => {
            if (!connection || !connection.idx) return // Skip invalid connections
            
            if (filteredNodes.has(connection.idx) && !currentLevelNodeIds.has(connection.idx)) {
              // Make sure this node isn't already in a previous level
              let nodeAlreadyExists = false
              for (let checkLevel = 0; checkLevel < level; checkLevel++) {
                const levelToCheck = nodesByLevel.get(checkLevel)
                if (levelToCheck && levelToCheck.some(n => n && n.idx === connection.idx)) {
                  nodeAlreadyExists = true
                  break
                }
              }
              
              if (!nodeAlreadyExists) {
                currentLevelNodeIds.add(connection.idx)
                currentLevelNodes.push(filteredNodes.get(connection.idx))
              }
            }
          })
        }
      })
      
      if (currentLevelNodes.length > 0) {
        nodesByLevel.set(level, currentLevelNodes)
      } else {
        break // No more connections found, stop building levels
      }
    }
    
    return nodesByLevel
  }

  const treeLayout = buildTreeLayout(selectedPaths, 50, causalLinksCount, maxDepth)

  // NOW we can do conditional returns after all hooks
  if (selectedIdx === null || selectedIdx === undefined || !chunksData.length) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <span style={{ color: '#aaa', fontSize: '1.2rem' }}>
          Loading attribution graph...
        </span>
      </div>
    )
  }
  
  if (!selectedPaths.length || treeLayout.size === 0) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <span style={{ color: '#aaa', fontSize: '1.2rem' }}>
          No significant connections found. Select a different step.
        </span>
      </div>
    )
  }

  // Calculate normalized importance scores for connections
  const normalizeConnectionWeights = () => {
    const connectionWeights = []
    
    // Collect all connection weights
    treeLayout.forEach((level, levelIndex) => {
      if (level && Array.isArray(level)) {
        level.forEach(node => {
          if (node) {
            // Handle both sources and targets
            const connections = node.sources || node.targets || []
            connections.forEach(connection => {
              if (connection && connection.score !== undefined) {
                connectionWeights.push(Math.abs(connection.score))
              }
            })
          }
        })
      }
    })
    
    // Find min and max weights for normalization
    const maxWeight = Math.max(...connectionWeights, 0.001)
    const minWeight = Math.min(...connectionWeights, 0)
    
    return { maxWeight, minWeight }
  }

  // Calculate normalized importance scores for nodes
  const normalizeNodeImportance = () => {
    const nodeImportances = []
    
    // Collect all node importance scores
    treeLayout.forEach((level, levelIndex) => {
      if (level && Array.isArray(level)) {
        level.forEach(node => {
          if (node && node.idx !== undefined) {
            const chunk = chunksData[node.idx]
            if (chunk && chunk.importance !== undefined) {
              nodeImportances.push(Math.abs(chunk.importance))
            }
          }
        })
      }
    })
    
    // Find min and max importance for normalization
    const maxImportance = Math.max(...nodeImportances, 0.001)
    const minImportance = Math.min(...nodeImportances, 0)
    
    return { maxImportance, minImportance }
  }

  const { maxWeight: maxConnectionWeight, minWeight: minConnectionWeight } = normalizeConnectionWeights()
  const { maxImportance: maxNodeImportance, minImportance: minNodeImportance } = normalizeNodeImportance()
  
  // Calculate actual width needed for tree layout
  const calculateRequiredWidth = () => {
    let maxNodesInLevel = 0
    treeLayout.forEach((level, levelIndex) => {
      maxNodesInLevel = Math.max(maxNodesInLevel, level.length)
    })
    const minWidth = Math.max(600, maxNodesInLevel * nodeGapX + 200) // Space for widest level plus padding
    return minWidth
  }
  
  const width = Math.max(600, calculateRequiredWidth())
  const height = Math.max(400, treeLayout.size * levelGapY + 200) // Height based on number of levels
  
  // Position nodes in a tree layout
  const nodePositions = new Map()
  const centerX = width / 2
  const startY = 100 // Start from top with padding
  
  // Position nodes based on tree direction
  const numLevels = treeLayout.size
  
  treeLayout.forEach((level, levelIndex) => {
    if (level && Array.isArray(level)) {
      let levelY
      
      if (treeDirection === 'outgoing') {
        // For outgoing: selected node at top (level 0), tree grows downward
        levelY = startY + levelIndex * levelGapY
      } else {
        // For incoming: selected node at bottom (level 0), tree grows upward
        levelY = startY + (numLevels - 1 - levelIndex) * levelGapY
      }
      
      const numNodesInLevel = level.length
      
      level.forEach((node, nodeIndex) => {
        if (node && node.idx !== undefined) {
          // Center the nodes in this level horizontally
          const totalWidth = (numNodesInLevel - 1) * nodeGapX
          const startX = centerX - totalWidth / 2
          const x = startX + nodeIndex * nodeGapX
          
          nodePositions.set(node.idx, { x, y: levelY })
        }
      })
    }
  })
  
  // Helper function to get node position
  const getFinalNodePosition = (nodeIdx) => {
    return nodePositions.get(nodeIdx) || { x: centerX, y: startY }
  }

  // Get unique connections to avoid duplicates
  const getUniqueConnections = () => {
    const connections = []
    const processedConnections = new Set()
    
    treeLayout.forEach((level, levelIndex) => {
      if (level && Array.isArray(level)) {
        level.forEach(node => {
          if (node) {
            // Handle both sources (incoming) and targets (outgoing)
            const nodeConnections = node.sources || node.targets || []
            const isOutgoing = !!node.targets // Determine if this is outgoing connections
            
            if (nodeConnections.length > 0) {
              // Only include connections that are actually in the tree layout
              const visibleConnections = nodeConnections.filter(connection => {
                if (!connection || connection.idx === undefined) return false
                // Check if connection exists in any level of the tree
                for (const [_, levelNodes] of treeLayout) {
                  if (levelNodes && Array.isArray(levelNodes) && levelNodes.some(n => n && n.idx === connection.idx)) {
                    return true
                  }
                }
                return false
              })
              
              if (visibleConnections.length > 0) {
                const connectionKey = isOutgoing ? `source-${node.idx}` : `target-${node.idx}`
                if (!processedConnections.has(connectionKey)) {
                  processedConnections.add(connectionKey)
                  connections.push({
                    node: node,
                    connections: visibleConnections,
                    isOutgoing: isOutgoing
                  })
                }
              }
            }
          }
        })
      }
    })
    
    return connections
  }

  const uniqueConnections = getUniqueConnections()

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        overflow: 'hidden',
        position: 'relative',
        touchAction: 'manipulation' // Improve touch handling on mobile
      }}
    >
      <div style={{ 
        width: width, 
        height: height, 
        position: 'relative',
        minWidth: '100%', // Ensure it takes at least full width of container
        minHeight: '100%'
      }}>
        <svg ref={svgRef} width={width} height={height} style={{ 
          width: '100%', 
          height: '100%', 
          display: 'block',
          touchAction: 'manipulation' // Better touch handling
        }}>
          <defs>
            {/* Arrow marker with better visibility */}
            <marker
              id="arrow"
              markerWidth="10"
              markerHeight="8"
              refX="9"
              refY="4"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon
                points="0 0, 10 4, 0 8"
                fill="#666"
              />
            </marker>
          </defs>

          <g className="zoom-group">
            {/* Connections - render before nodes so they appear behind */}
            <g className="connections">
              {uniqueConnections.map((connection) => {
                return (
                  <g key={`connection-${connection.node.idx}`}>
                    {connection.connections.map((connectedNode) => {
                      const connectedPos = getFinalNodePosition(connectedNode.idx)
                      const nodePos = getFinalNodePosition(connection.node.idx)
                      
                      // Calculate normalized opacity based on connection importance
                      const normalizedWeight = maxConnectionWeight > minConnectionWeight ? 
                        (Math.abs(connectedNode.score) - minConnectionWeight) / (maxConnectionWeight - minConnectionWeight) : 0.5
                      const opacity = Math.max(0.3, Math.min(0.9, normalizedWeight * 0.8 + 0.3))
                      
                      // Calculate connection points and direction based on connection type
                      let startPos, endPos, dx, dy
                      if (connection.isOutgoing) {
                        // For outgoing: arrow goes from current node to connected node
                        startPos = nodePos
                        endPos = connectedPos
                      } else {
                        // For incoming: arrow goes from connected node to current node
                        startPos = connectedPos
                        endPos = nodePos
                      }
                      
                      dx = endPos.x - startPos.x
                      dy = endPos.y - startPos.y
                      const distance = Math.sqrt(dx * dx + dy * dy)
                      
                      // Normalize direction vector
                      const unitX = dx / distance
                      const unitY = dy / distance
                      
                      // Check if this is a diagonal arrow (not primarily horizontal or vertical)
                      const absX = Math.abs(unitX)
                      const absY = Math.abs(unitY)
                      const isDiagonal = absX > 0.3 && absY > 0.3 // Both components are significant
                      
                      // Start point (edge of source node)
                      const startX = startPos.x + unitX * (nodeW / 2)
                      const startY = startPos.y + unitY * (nodeH / 2)
                      
                      // End point (edge of target node, with small offset for diagonal arrows only)
                      const endOffset = isDiagonal ? (absX >= absY ? 16 : 8) : 0
                      const endX = endPos.x - unitX * (nodeW / 2 + endOffset)
                      const endY = endPos.y - unitY * (nodeH / 2 + endOffset)
                      
                      // Always use straight lines - clean and simple
                      const pathData = `M ${startX} ${startY} L ${endX} ${endY}`
                      
                      return (
                        <path
                          key={`${connection.isOutgoing ? 'out' : 'in'}-${connection.node.idx}-${connectedNode.idx}`}
                          d={pathData}
                          stroke="#666"
                          strokeWidth={2}
                          fill="none"
                          opacity={opacity}
                          markerEnd="url(#arrow)"
                          style={{ pointerEvents: 'none' }}
                        />
                      )
                    })}
                  </g>
                )
              })}
            </g>

            {/* Nodes - render after connections so they appear on top */}
            <g className="nodes">
              {Array.from(treeLayout.entries()).map(([levelIndex, level]) => {
                if (!level || !Array.isArray(level)) return null
                
                return (
                  <g key={`level-${levelIndex}`}>
                    {level.filter(node => node && node.idx !== undefined).map((node) => {
                      const pos = getFinalNodePosition(node.idx)
                      const chunk = chunksData[node.idx]

                      // Calculate node opacity based on importance
                      const nodeImportance = chunk && chunk.importance !== undefined ? Math.abs(chunk.importance) : 0.5
                      const normalizedImportance = maxNodeImportance > minNodeImportance ? 
                        (nodeImportance - minNodeImportance) / (maxNodeImportance - minNodeImportance) : 0.5
                      const nodeOpacity = Math.max(0.4, Math.min(1.0, normalizedImportance * 0.7 + 0.3))

                      return (
                        <Node
                          key={`node-${node.idx}`}
                          node={node}
                          pos={pos}
                          chunk={chunk}
                          isSelected={node.idx === selectedIdx}
                          isHovered={hoveredNode && hoveredNode.id === node.idx}
                          nodeW={nodeW}
                          nodeH={nodeH}
                          opacity={nodeOpacity}
                          onNodeHover={(event, nodeData) => {
                            // Always trigger hover, even for selected nodes
                            if (onNodeHover) {
                              onNodeHover(event, nodeData)
                            }
                          }}
                          onNodeLeave={onNodeLeave}
                          onNodeClick={onNodeClick}
                        />
                      )
                    })}
                  </g>
                )
              })}
            </g>
          </g>
        </svg>
      </div>
    </div>
  )
} 



