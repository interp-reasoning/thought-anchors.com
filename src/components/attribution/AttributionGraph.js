'use client'
import { useRef, useEffect } from 'react'
import Node from './Node'
import * as d3 from 'd3'

export default function AttributionGraph({ 
  selectedIdx, 
  chunksData, 
  selectedPaths,
  onNodeHover,
  onNodeLeave,
  onNodeClick
}) {
  // Layout constants
  const nodeW = 110
  const nodeH = 70
  const levelGapY = 120  // Vertical spacing between levels
  const nodeGapX = 150  // Horizontal spacing between nodes at same level
  const arrowOffset = 5
  
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
  const buildTreeLayout = (paths, maxNodes = 10) => {
    console.log('Building tree layout with paths:', paths)
    const allNodes = new Map()
    const nodesByLevel = new Map()
    
    // First, collect all unique nodes from paths
    paths.forEach(path => {
      path.forEach(node => {
        if (!allNodes.has(node.idx)) {
          allNodes.set(node.idx, node)
        }
      })
    })
    
    // Filter to most important nodes if we have too many
    const nodeImportanceMap = new Map()
    Array.from(allNodes.values()).forEach(node => {
      const totalImportance = node.sources ? 
        node.sources.reduce((sum, source) => sum + source.score, 0) : 0
      nodeImportanceMap.set(node.idx, totalImportance)
    })
    
    const sortedNodesByImportance = Array.from(allNodes.keys())
      .filter(nodeIdx => nodeIdx !== selectedIdx)
      .sort((a, b) => nodeImportanceMap.get(b) - nodeImportanceMap.get(a))
      .slice(0, maxNodes - 1)
    
    sortedNodesByImportance.push(selectedIdx) // Always include target
    
    // Filter nodes
    const filteredNodes = new Map()
    sortedNodesByImportance.forEach(nodeIdx => {
      if (allNodes.has(nodeIdx)) {
        const node = allNodes.get(nodeIdx)
        const filteredSources = node.sources ? 
          node.sources.filter(source => sortedNodesByImportance.includes(source.idx)) : []
        filteredNodes.set(nodeIdx, { ...node, sources: filteredSources })
      }
    })
    
    // Build tree levels: selected node at bottom (level 0)
    nodesByLevel.set(0, [filteredNodes.get(selectedIdx)])
    
    // Level 1: Direct influences on selected node
    const level1Nodes = []
    const selectedNode = filteredNodes.get(selectedIdx)
    if (selectedNode && selectedNode.sources) {
      // Sort sources by normalized score and take top 3 (matching detail panel)
      const topSources = selectedNode.sources
        .sort((a, b) => b.score - a.score) // Sort by normalized score descending
        .slice(0, 3) // Take top 3
      
      topSources.forEach(source => {
        if (filteredNodes.has(source.idx)) {
          // Keep the original node with all its sources for level 2 building
          level1Nodes.push(filteredNodes.get(source.idx))
        }
      })
    }
    if (level1Nodes.length > 0) {
      nodesByLevel.set(1, level1Nodes)
    }
    
    // Level 2: Influences on level 1 nodes
    const level2Nodes = []
    const level2NodeIds = new Set()
    level1Nodes.forEach(node => {
      if (node.sources) {
        // Sort sources by normalized score and take top 3 for each level 1 node
        const topSources = node.sources
          .sort((a, b) => b.score - a.score) // Sort by normalized score descending
          .slice(0, 3) // Take top 3
        
        topSources.forEach(source => {
          if (filteredNodes.has(source.idx) && !level2NodeIds.has(source.idx)) {
            level2NodeIds.add(source.idx)
            // Keep the original node with all its sources
            level2Nodes.push(filteredNodes.get(source.idx))
          }
        })
      }
    })
    if (level2Nodes.length > 0) {
      nodesByLevel.set(2, level2Nodes)
    }
    
    console.log('Tree levels:', Object.fromEntries(nodesByLevel))
    return nodesByLevel
  }

  const treeLayout = buildTreeLayout(selectedPaths)

  // NOW we can do conditional returns after all hooks
  if (!selectedPaths.length || treeLayout.size === 0) return (
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

  // Calculate normalized importance scores for connections
  const normalizeConnectionWeights = () => {
    const connectionWeights = []
    
    // Collect all connection weights
    treeLayout.forEach((level, levelIndex) => {
      if (level && Array.isArray(level)) {
        level.forEach(node => {
          if (node && node.sources && node.sources.length > 0) {
            node.sources.forEach(source => {
              if (source && source.score !== undefined) {
                connectionWeights.push(Math.abs(source.score))
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
  
  // Reverse the tree layout - higher levels at top, selected node at bottom
  const numLevels = treeLayout.size
  
  treeLayout.forEach((level, levelIndex) => {
    if (level && Array.isArray(level)) {
      // Invert the level position: level 2 -> y=100, level 1 -> y=220, level 0 -> y=340
      const levelY = startY + (numLevels - 1 - levelIndex) * levelGapY
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
          if (node && node.sources && node.sources.length > 0) {
            // Only include sources that are actually in the tree layout
            const visibleSources = node.sources.filter(source => {
              if (!source || source.idx === undefined) return false
              // Check if source exists in any level of the tree
              for (const [_, levelNodes] of treeLayout) {
                if (levelNodes && Array.isArray(levelNodes) && levelNodes.some(n => n && n.idx === source.idx)) {
                  return true
                }
              }
              return false
            })
            
            if (visibleSources.length > 0) {
              const connectionKey = `target-${node.idx}`
              if (!processedConnections.has(connectionKey)) {
                processedConnections.add(connectionKey)
                connections.push({
                  target: node,
                  sources: visibleSources
                })
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
        position: 'relative' 
      }}
    >
      <div style={{ 
        width: width, 
        height: height, 
        position: 'relative',
        minWidth: '100%' // Ensure it takes at least full width of container
      }}>
        <svg ref={svgRef} width={width} height={height} style={{ width: '100%', height: '100%', display: 'block' }}>
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
                const targetPos = getFinalNodePosition(connection.target.idx)
                
                return (
                  <g key={`connection-${connection.target.idx}`}>
                    {connection.sources.map((source) => {
                      const sourcePos = getFinalNodePosition(source.idx)
                      
                      // Calculate normalized opacity based on connection importance
                      const normalizedWeight = maxConnectionWeight > minConnectionWeight ? 
                        (Math.abs(source.score) - minConnectionWeight) / (maxConnectionWeight - minConnectionWeight) : 0.5
                      const opacity = Math.max(0.3, Math.min(0.9, normalizedWeight * 0.8 + 0.3))
                      
                      // Calculate connection points on node edges
                      const dx = targetPos.x - sourcePos.x
                      const dy = targetPos.y - sourcePos.y
                      const distance = Math.sqrt(dx * dx + dy * dy)
                      
                      // Normalize direction vector
                      const unitX = dx / distance
                      const unitY = dy / distance
                      
                      // Check if this is a diagonal arrow (not primarily horizontal or vertical)
                      const absX = Math.abs(unitX)
                      const absY = Math.abs(unitY)
                      const isDiagonal = absX > 0.3 && absY > 0.3 // Both components are significant
                      
                      // Start point (edge of source node)
                      const startX = sourcePos.x + unitX * (nodeW / 2)
                      const startY = sourcePos.y + unitY * (nodeH / 2)
                      
                      // End point (edge of target node, with small offset for diagonal arrows only)
                      const endOffset = isDiagonal ? (absX >= absY ? 16 : 8) : 0
                      const endX = targetPos.x - unitX * (nodeW / 2 + endOffset)
                      const endY = targetPos.y - unitY * (nodeH / 2 + endOffset)
                      
                      // Always use straight lines - clean and simple
                      const pathData = `M ${startX} ${startY} L ${endX} ${endY}`
                      
                      return (
                        <path
                          key={`source-${source.idx}-to-${connection.target.idx}`}
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
                          nodeW={nodeW}
                          nodeH={nodeH}
                          opacity={nodeOpacity}
                          onNodeHover={onNodeHover}
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



