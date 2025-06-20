'use client'
import { useRef, useEffect } from 'react'
import Node from './Node'

export default function AttributionGraph({ selectedIdx, chunksData, selectedPaths }) {
  // Layout constants
  const nodeW = 100
  const nodeH = 50
  const levelGapY = 120  // Vertical spacing between levels
  const nodeGapX = 150  // Horizontal spacing between nodes at same level
  const arrowOffset = 5
  
  // Create ref for container - moved before conditional return
  const containerRef = useRef(null)

  // Build layout tree with smart positioning to avoid diagonals
  const buildLayoutTree = (paths, maxNodes = 10) => {
    console.log('Building layout tree with paths:', paths)
    const nodesByLevel = new Map()
    const allNodes = new Map()
    const nodeLevels = new Map()
    
    // First, collect all unique nodes from paths with their importance scores
    const nodeImportanceMap = new Map()
    paths.forEach(path => {
      path.forEach(node => {
        if (!allNodes.has(node.idx)) {
          allNodes.set(node.idx, node)
          // Calculate total importance for this node (sum of all its source scores)
          const totalImportance = node.sources ? 
            node.sources.reduce((sum, source) => sum + source.score, 0) : 0
          nodeImportanceMap.set(node.idx, totalImportance)
        }
      })
    })
    
    // Always include the selected target node
    const sortedNodesByImportance = Array.from(allNodes.keys())
      .filter(nodeIdx => nodeIdx !== selectedIdx) // Remove target from sorting
      .sort((a, b) => nodeImportanceMap.get(b) - nodeImportanceMap.get(a)) // Sort by importance desc
      .slice(0, maxNodes - 1) // Take top N-1 (leaving room for target)
    
    // Add the target back
    sortedNodesByImportance.push(selectedIdx)
    
    console.log('Node importance scores:', Object.fromEntries(nodeImportanceMap))
    console.log('Selected nodes (limited):', sortedNodesByImportance)
    
    // Filter allNodes to only include the most important ones
    const filteredNodes = new Map()
    sortedNodesByImportance.forEach(nodeIdx => {
      if (allNodes.has(nodeIdx)) {
        const node = allNodes.get(nodeIdx)
        // Filter the node's sources to only include other selected nodes
        const filteredSources = node.sources ? 
          node.sources.filter(source => sortedNodesByImportance.includes(source.idx)) : []
        filteredNodes.set(nodeIdx, { ...node, sources: filteredSources })
      }
    })
    
    // Replace allNodes with filtered set
    allNodes.clear()
    filteredNodes.forEach((node, nodeIdx) => {
      allNodes.set(nodeIdx, node)
    })
    
    // Build connection maps to understand the flow
    const sourceToTargets = new Map() // what each node points to
    const targetToSources = new Map() // what points to each node
    
    Array.from(allNodes.values()).forEach(node => {
      if (node.sources && node.sources.length > 0) {
        targetToSources.set(node.idx, node.sources.map(s => s.idx))
        node.sources.forEach(source => {
          if (!sourceToTargets.has(source.idx)) {
            sourceToTargets.set(source.idx, [])
          }
          sourceToTargets.get(source.idx).push(node.idx)
        })
      }
    })
    
    console.log('Source to targets:', Object.fromEntries(sourceToTargets))
    console.log('Target to sources:', Object.fromEntries(targetToSources))
    
    // Detect chains: sequences where each node has exactly one target and one source
    const findChains = () => {
      const chains = []
      const visited = new Set()
      
      // Find all potential chain starts (nodes that are not part of existing chains)
      Array.from(allNodes.keys()).forEach(nodeIdx => {
        if (visited.has(nodeIdx)) return
        
        const sources = targetToSources.get(nodeIdx) || []
        const targets = sourceToTargets.get(nodeIdx) || []
        
        // Start building a chain from this node
        const chain = [nodeIdx]
        visited.add(nodeIdx)
        
        // Extend backwards (find sources)
        let currentIdx = nodeIdx
        while (true) {
          const currentSources = targetToSources.get(currentIdx) || []
          if (currentSources.length === 1) {
            const sourceIdx = currentSources[0]
            const sourceTargets = sourceToTargets.get(sourceIdx) || []
            
            // Only add to chain if the source has exactly one target (this node)
            if (sourceTargets.length === 1 && sourceTargets[0] === currentIdx && !visited.has(sourceIdx)) {
              chain.unshift(sourceIdx)
              visited.add(sourceIdx)
              currentIdx = sourceIdx
            } else {
              break
            }
          } else {
            break
          }
        }
        
        // Extend forwards (find targets)
        currentIdx = nodeIdx
        while (true) {
          const currentTargets = sourceToTargets.get(currentIdx) || []
          if (currentTargets.length === 1) {
            const targetIdx = currentTargets[0]
            const targetSources = targetToSources.get(targetIdx) || []
            
            // Only add to chain if the target has exactly one source (this node)
            if (targetSources.length === 1 && targetSources[0] === currentIdx && !visited.has(targetIdx)) {
              chain.push(targetIdx)
              visited.add(targetIdx)
              currentIdx = targetIdx
            } else {
              break
            }
          } else {
            break
          }
        }
        
        if (chain.length > 1) {
          chains.push(chain)
          console.log('Found chain:', chain)
        }
      })
      
      return chains
    }
    
    const chains = findChains()
    
    // Assign levels
    const assignNodeToLevel = (nodeIdx, level) => {
      if (nodeLevels.has(nodeIdx)) {
        return nodeLevels.get(nodeIdx)
      }
      
      nodeLevels.set(nodeIdx, level)
      
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, [])
      }
      
      const node = allNodes.get(nodeIdx)
      if (node && !nodesByLevel.get(level).some(n => n.idx === nodeIdx)) {
        nodesByLevel.get(level).push(node)
      }
      
      return level
    }
    
    // Start with target at level 0
    assignNodeToLevel(selectedIdx, 0)
    
    // Place chains at the same level as their connection to the target
    chains.forEach(chain => {
      console.log('Processing chain:', chain)
      
      // Find if any node in the chain connects to the target
      const chainConnectionToTarget = chain.find(nodeIdx => {
        const targets = sourceToTargets.get(nodeIdx) || []
        return targets.includes(selectedIdx)
      })
      
      if (chainConnectionToTarget) {
        // Check if this is a simple linear chain (each node has exactly one source and one target)
        const isSimpleLinearChain = chain.every(nodeIdx => {
          const sources = targetToSources.get(nodeIdx) || []
          const targets = sourceToTargets.get(nodeIdx) || []
          // Allow 0 sources for start of chain, 0 targets for end of chain
          return sources.length <= 1 && targets.length <= 1
        })
        
        console.log(`Chain ${chain}: isSimpleLinearChain = ${isSimpleLinearChain}`)
        console.log(`ChainConnectionToTarget: ${chainConnectionToTarget}`)
        console.log(`Target (selectedIdx): ${selectedIdx}`)
        
        if (isSimpleLinearChain) {
          console.log(`Simple linear chain detected: ${chain}, arranging vertically`)
          // For simple linear chains, arrange vertically
          // The node that connects to target gets level -1, others get successive levels
          const targetConnectionIndex = chain.indexOf(chainConnectionToTarget)
          console.log(`Target connection index: ${targetConnectionIndex}`)
          
          chain.forEach((nodeIdx, index) => {
            // Calculate level relative to the connection point
            // We want the chain to flow downward, so earlier nodes get higher (more negative) levels
            const levelOffset = targetConnectionIndex - index
            const level = -1 - levelOffset
            console.log(`  Assigning node ${nodeIdx} (index ${index}) to level ${level} (offset: ${levelOffset})`)
            assignNodeToLevel(nodeIdx, level)
          })
        } else {
          console.log(`Complex chain detected: ${chain}, arranging horizontally`)
          // For complex chains, place the entire chain at level -1 (horizontal)
          chain.forEach(nodeIdx => {
            assignNodeToLevel(nodeIdx, -1)
          })
        }
      } else {
        console.log(`Chain ${chain} does not connect to target ${selectedIdx}`)
      }
    })
    
    // Handle remaining nodes with the original algorithm
    const processRemainingNodes = () => {
      const processLevel = (currentLevel) => {
        const nodesAtLevel = nodesByLevel.get(currentLevel) || []
        const allSourcesForThisLevel = new Set()
        
        console.log(`Processing remaining nodes at level ${currentLevel}, nodes:`, nodesAtLevel.map(n => n.idx))
        
        nodesAtLevel.forEach(node => {
          if (node.sources) {
            node.sources.forEach(source => {
              if (!nodeLevels.has(source.idx)) {
                allSourcesForThisLevel.add(source.idx)
              }
            })
          }
        })
        
        if (allSourcesForThisLevel.size > 0) {
          const sourceLevel = currentLevel - 1
          console.log(`  Assigning remaining sources to level ${sourceLevel}:`, Array.from(allSourcesForThisLevel))
          allSourcesForThisLevel.forEach(sourceIdx => {
            assignNodeToLevel(sourceIdx, sourceLevel)
          })
          
          processLevel(sourceLevel)
        }
      }
      
      processLevel(0)
    }
    
    processRemainingNodes()
    
    // Debug: Print final level assignments
    console.log('=== FINAL LEVEL ASSIGNMENTS ===')
    for (const [level, nodes] of nodesByLevel.entries()) {
      console.log(`Level ${level}:`, nodes.map(n => n.idx))
    }
    console.log('Node levels map:', Object.fromEntries(nodeLevels))
    
    return nodesByLevel
  }

  // useEffect for scrolling - moved before conditional return
  useEffect(() => {
    if (containerRef.current && selectedPaths.length > 0) {
      const container = containerRef.current
      const height = Math.max(600, 800) // Use a reasonable default height
      const scrollTop = Math.max(0, (height - container.clientHeight) / 2)
      container.scrollTop = scrollTop
    }
  }, [selectedIdx, selectedPaths])

  const nodesByLevel = buildLayoutTree(selectedPaths)
  const minLevel = Math.min(...nodesByLevel.keys())
  const maxLevel = Math.max(...nodesByLevel.keys())

  // NOW we can do conditional returns after all hooks
  if (!selectedPaths.length) return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <span style={{ color: '#aaa', fontSize: '1.2rem' }}>
        Select a step to see its attribution graph
      </span>
    </div>
  )
  
  // Calculate positions with horizontal arrangement for same-level nodes
  // Calculate actual width needed based on nodes instead of fixed width
  const calculateRequiredWidth = () => {
    let maxNodesAtLevel = 0
    for (const [level, nodes] of nodesByLevel.entries()) {
      maxNodesAtLevel = Math.max(maxNodesAtLevel, nodes.length)
    }
    
    // Calculate width needed: left margin + nodes + gaps + right margin
    const leftMargin = 100
    const rightMargin = 100
    const totalNodeWidth = maxNodesAtLevel * nodeW
    const totalGapWidth = Math.max(0, maxNodesAtLevel - 1) * nodeGapX
    
    return leftMargin + totalNodeWidth + totalGapWidth + rightMargin
  }
  
  const width = Math.max(400, calculateRequiredWidth()) // Minimum 400px width
  const height = Math.max(600, (maxLevel - minLevel + 2) * levelGapY)
  const startX = 150 // Start from left with some padding instead of centering
  
  // Find level for each node - improved to handle the new layout
  const findNodeLevel = (nodeIdx) => {
    for (const [level, nodes] of nodesByLevel.entries()) {
      if (nodes.some(n => n.idx === nodeIdx)) {
        return level
      }
    }
    return 0
  }
  
  // First pass: calculate base positions
  const nodePositions = new Map()
  
  const getNodePosition = (nodeIdx, level) => {
    // Check if position is already calculated
    if (nodePositions.has(nodeIdx)) {
      return nodePositions.get(nodeIdx)
    }
    
    const nodesAtLevel = nodesByLevel.get(level) || []
    const totalNodes = nodesAtLevel.length
    
    let x
    if (totalNodes === 1) {
      x = startX
    } else {
      // Sort nodes at this level by step number for consistent positioning
      const sortedNodes = [...nodesAtLevel].sort((a, b) => a.idx - b.idx)
      
      const nodeIndex = sortedNodes.findIndex(n => n.idx === nodeIdx)
      const totalWidth = (totalNodes - 1) * nodeGapX
      const levelStartX = startX
      x = levelStartX + nodeIndex * nodeGapX
    }
    
    // Adjust y position to account for negative levels
    const adjustedLevel = level - minLevel
    const position = {
      x,
      y: 100 + adjustedLevel * levelGapY
    }
    
    nodePositions.set(nodeIdx, position)
    return position
  }

  // Second pass: adjust positions for vertical alignment
  const adjustPositionsForVerticalAlignment = () => {
    // For single-source connections, try to align them vertically when possible
    Array.from(nodesByLevel.entries()).forEach(([level, nodes]) => {
      nodes.forEach(node => {
        if (node.sources && node.sources.length === 1) {
          const sourceIdx = node.sources[0].idx
          const sourceLevel = findNodeLevel(sourceIdx)
          
          // Only align if they are at different levels (vertical connection)
          if (sourceLevel !== level) {
            const targetPos = getNodePosition(node.idx, level)
            const sourcePos = getNodePosition(sourceIdx, sourceLevel)
            
            // Check if we can align without overlapping other nodes
            const sourceNodesAtLevel = nodesByLevel.get(sourceLevel) || []
            const canAlign = sourceNodesAtLevel.length === 1 || 
                           !sourceNodesAtLevel.some(n => 
                             n.idx !== sourceIdx && 
                             Math.abs(getNodePosition(n.idx, sourceLevel).x - targetPos.x) < nodeW + 20
                           )
            
            if (canAlign) {
              // Align source directly above target
              const alignedSourcePos = {
                x: targetPos.x,
                y: sourcePos.y
              }
              nodePositions.set(sourceIdx, alignedSourcePos)
            }
          }
        }
      })
    })
  }
  
  // Calculate all base positions first
  Array.from(nodesByLevel.entries()).forEach(([level, nodes]) => {
    nodes.forEach(node => {
      getNodePosition(node.idx, level)
    })
  })
  
  // Then adjust for vertical alignment
  adjustPositionsForVerticalAlignment()
  
  // Helper function to get final position
  const getFinalNodePosition = (nodeIdx) => {
    return nodePositions.get(nodeIdx) || { x: startX, y: 100 }
  }

  // Get unique connections to avoid duplicates
  const getUniqueConnections = () => {
    const connections = []
    const processedConnections = new Set()
    
    // Get all nodes that are actually in the layout
    const nodesInLayout = new Set()
    Array.from(nodesByLevel.entries()).forEach(([level, nodes]) => {
      nodes.forEach(node => {
        nodesInLayout.add(node.idx)
      })
    })
    
    Array.from(nodesByLevel.entries()).forEach(([level, nodes]) => {
      nodes.forEach(node => {
        if (node.sources && node.sources.length > 0) {
          // Only include sources that are actually in the layout
          const visibleSources = node.sources.filter(source => nodesInLayout.has(source.idx))
          
          if (visibleSources.length > 0) {
            const connectionKey = `target-${node.idx}`
            if (!processedConnections.has(connectionKey)) {
              processedConnections.add(connectionKey)
              connections.push({
                target: node,
                targetLevel: level,
                sources: visibleSources
              })
            }
          }
        }
      })
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
        overflow: 'auto',
        position: 'relative' 
      }}
    >
      <div style={{ 
        width: width, 
        height: height, 
        position: 'relative',
        minWidth: '100%' // Ensure it takes at least full width of container
      }}>
        <svg width={width} height={height} style={{ width: '100%', height: '100%', display: 'block' }}>
          <defs>
            <marker
              id="arrow"
              markerWidth="10"
              markerHeight="7"
              refX="10"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#666"
              />
            </marker>
          </defs>

          {/* Connections - render before nodes so they appear behind */}
          <g className="connections">
            {uniqueConnections.map((connection) => {
              const targetPos = getFinalNodePosition(connection.target.idx)
              
              if (connection.sources.length === 1) {
                // Single source - check if horizontal, vertical, or corner connection
                const sourcePos = getFinalNodePosition(connection.sources[0].idx)
                
                const isHorizontal = Math.abs(sourcePos.y - targetPos.y) < 10 // Same level
                const isVerticallyAligned = Math.abs(sourcePos.x - targetPos.x) < 10 // Same x position
                
                if (isHorizontal) {
                  // Horizontal connection
                  return (
                    <g key={`connection-${connection.target.idx}`}>
                      <line
                        x1={sourcePos.x + nodeW/2}
                        y1={sourcePos.y}
                        x2={targetPos.x - nodeW/2}
                        y2={targetPos.y}
                        stroke="#666"
                        strokeWidth={2}
                        markerEnd="url(#arrow)"
                      />
                      <text
                        x={(sourcePos.x + targetPos.x) / 2}
                        y={sourcePos.y - 15}
                        textAnchor="middle"
                        fontSize="0.9em"
                        fill="#666"
                      >
                        {/*connection.sources[0].score.toFixed(2)*/}
                      </text>
                    </g>
                  )
                } else if (isVerticallyAligned) {
                  // Vertical connection (aligned)
                  return (
                    <g key={`connection-${connection.target.idx}`}>
                      <line
                        x1={sourcePos.x}
                        y1={sourcePos.y + nodeH/2}
                        x2={targetPos.x}
                        y2={targetPos.y - nodeH/2 + arrowOffset}
                        stroke="#666"
                        strokeWidth={2}
                        markerEnd="url(#arrow)"
                      />
                      <text
                        x={sourcePos.x + 15}
                        y={(sourcePos.y + targetPos.y) / 2}
                        textAnchor="start"
                        fontSize="0.9em"
                        fill="#666"
                      >
                        {/*connection.sources[0].score.toFixed(2)*/}
                      </text>
                    </g>
                  )
                } else {
                  // Corner connection (up then right) - simple L-shape
                  return (
                    <g key={`connection-${connection.target.idx}`}>
                      {/* Vertical line up from source to target's level */}
                      <line
                        x1={sourcePos.x}
                        y1={sourcePos.y - nodeH/2}
                        x2={sourcePos.x}
                        y2={targetPos.y}
                        stroke="#666"
                        strokeWidth={2}
                      />
                      {/* Horizontal line right to target's left side */}
                      <line
                        x1={sourcePos.x}
                        y1={targetPos.y}
                        x2={targetPos.x - nodeW/2}
                        y2={targetPos.y}
                        stroke="#666"
                        strokeWidth={2}
                        markerEnd="url(#arrow)"
                      />
                      {/* Score label */}
                      <text
                        x={(sourcePos.x + targetPos.x) / 2}
                        y={targetPos.y - 15}
                        textAnchor="middle"
                        fontSize="0.9em"
                        fill="#666"
                      >
                        {/*connection.sources[0].score.toFixed(2)*/}
                      </text>
                    </g>
                  )
                }
              } else {
                // Multiple sources - bus connection
                const busY = targetPos.y - levelGapY / 2
                
                return (
                  <g key={`bus-${connection.target.idx}`}>
                    {/* Individual lines from each source to bus */}
                    {connection.sources.map((source) => {
                      const sourcePos = getFinalNodePosition(source.idx)
                      
                      return (
                        <g key={`source-${source.idx}-to-${connection.target.idx}`}>
                          <line
                            x1={sourcePos.x}
                            y1={sourcePos.y + nodeH/2}
                            x2={sourcePos.x}
                            y2={busY}
                            stroke="#666"
                            strokeWidth={2}
                          />
                          <text
                            x={sourcePos.x + 15}
                            y={sourcePos.y + nodeH/2 + 20}
                            textAnchor="start"
                            fontSize="0.9em"
                            fill="#666"
                          >
                            {/*source.score.toFixed(2)*/}
                          </text>
                        </g>
                      )
                    })}
                    
                    {/* Horizontal bus line */}
                    {connection.sources.length > 1 && (
                      <line
                        x1={Math.min(...connection.sources.map(s => getFinalNodePosition(s.idx).x))}
                        y1={busY}
                        x2={Math.max(...connection.sources.map(s => getFinalNodePosition(s.idx).x))}
                        y2={busY}
                        stroke="#666"
                        strokeWidth={3}
                      />
                    )}
                    
                    {/* Line from bus to target */}
                    <line
                      x1={targetPos.x}
                      y1={busY}
                      x2={targetPos.x}
                      y2={targetPos.y - nodeH/2 + arrowOffset}
                      stroke="#666"
                      strokeWidth={3}
                      markerEnd="url(#arrow)"
                    />
                    
                    {/* Bus junction point */}
                    <circle
                      cx={targetPos.x}
                      cy={busY}
                      r={4}
                      fill="#666"
                    />
                  </g>
                )
              }
            })}
          </g>

          {/* Nodes - render after connections so they appear on top */}
          <g className="nodes">
            {Array.from(nodesByLevel.entries()).map(([level, nodes]) =>
              nodes.map((node) => {
                const pos = getFinalNodePosition(node.idx)
                const chunk = chunksData[node.idx]

                return (
                  <Node
                    key={`node-${node.idx}`}
                    node={node}
                    pos={pos}
                    chunk={chunk}
                    isSelected={node.idx === selectedIdx}
                    nodeW={nodeW}
                    nodeH={nodeH}
                  />
                )
              })
            )}
          </g>
        </svg>
      </div>
    </div>
  )
} 



