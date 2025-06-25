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
  isAnimating = false,
  visibleAnimationNodes = new Set(),
  currentAnimationStep = 0,
  animationStepList = [],
  currentStepImportanceData = [],
  onNodeHover,
  onNodeLeave,
  onNodeClick
}) {
  // Layout constants
  const nodeW = 110
  const nodeH = 70
  const levelGapY = 100 // Vertical spacing between levels
  const nodeGapX = 150  // Horizontal spacing between nodes at same level

  
  // Create ref for container and zoom
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const zoomRef = useRef(null)

  // useEffect for scrolling
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

  // Reset zoom when animation starts
  useEffect(() => {
    if (visibleAnimationNodes.size > 0 && svgRef.current && zoomRef.current) {
      // Small delay to ensure nodes are rendered before resetting view
      const timer = setTimeout(() => {
        const svg = d3.select(svgRef.current)
        svg.transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity)
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [visibleAnimationNodes.size])

  // Auto-center view when animation nodes change to keep everything visible
  useEffect(() => {
    if (visibleAnimationNodes.size > 0 && svgRef.current && zoomRef.current) {
      // Calculate bounds of all visible animation nodes
      const animationNodesList = Array.from(visibleAnimationNodes)
      const animationTreeLayout = buildAnimationTreeLayout(animationNodesList, currentStepImportanceData)
      
      if (animationTreeLayout.size === 0) return
      
      // Get positions of all nodes
      const nodePositions = animationNodesList.map(nodeIdx => 
        getAnimationNodePosition(nodeIdx, animationTreeLayout)
      )
      
      if (nodePositions.length === 0) return
      
      // Calculate required dimensions for positioning
      const width = visibleAnimationNodes.size > 0 ? 
        Math.max(800, containerRef.current?.clientWidth || 800) : 
        Math.max(600, 800) // fallback
      const height = visibleAnimationNodes.size > 0 ? 
        Math.max(600, containerRef.current?.clientHeight || 600) : 
        Math.max(400, 600) // fallback
      
      // Calculate bounds
      const minX = Math.min(...nodePositions.map(pos => pos.x)) - nodeW
      const maxX = Math.max(...nodePositions.map(pos => pos.x)) + nodeW
      const minY = Math.min(...nodePositions.map(pos => pos.y)) - nodeH
      const maxY = Math.max(...nodePositions.map(pos => pos.y)) + nodeH
      
      // Calculate center of the animation content
      const contentCenterX = (minX + maxX) / 2
      const contentCenterY = (minY + maxY) / 2
      
      // Calculate container center
      const containerCenterX = width / 2
      const containerCenterY = height / 2
      
      // Calculate required translation to center the content
      const translateX = containerCenterX - contentCenterX
      const translateY = containerCenterY - contentCenterY
      
      // Calculate scale to fit content if needed
      const contentWidth = maxX - minX
      const contentHeight = maxY - minY
      const scaleX = contentWidth > 0 ? (width * 0.8) / contentWidth : 1
      const scaleY = contentHeight > 0 ? (height * 0.8) / contentHeight : 1
      const scale = Math.min(1, scaleX, scaleY) // Don't zoom in, only zoom out if needed
      
      // Apply the transform smoothly with increased duration
      const svg = d3.select(svgRef.current)
      const transform = d3.zoomIdentity
        .translate(translateX, translateY)
        .scale(scale)
      
      svg.transition()
        .duration(2500) // Increased to 2.5 seconds
        .call(zoomRef.current.transform, transform)
    }
  }, [visibleAnimationNodes, currentStepImportanceData])

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

  // Build animation tree layout
  const buildAnimationTreeLayout = (animationNodes, stepData) => {
    if (!animationNodes || animationNodes.length === 0) return new Map()
    
    const animationNodesList = Array.from(animationNodes)
    const nodesByLevel = new Map()
    const maxAnimationLevels = 5 // Limit to 5 levels maximum
    
    // Helper function to get top-k connections from a source node
    const getTopConnections = (sourceIdx, k) => {
      const stepInfo = stepData.find(step => step.source_chunk_idx === sourceIdx)
      if (!stepInfo?.target_impacts) return []
      
      return stepInfo.target_impacts
        .sort((a, b) => Math.abs(b.importance_score) - Math.abs(a.importance_score))
        .slice(0, k)
        .map(impact => impact.target_chunk_idx)
    }
    
    // Helper function to check if nodeA has a direct strong connection to nodeB
    const hasDirectConnection = (sourceIdx, targetIdx, k) => {
      const topConnections = getTopConnections(sourceIdx, k)
      return topConnections.includes(targetIdx)
    }
    
    // Start with the first animation node at level 0
    const startNode = animationNodesList[0]
    nodesByLevel.set(0, [startNode])
    const placedNodes = new Set([startNode])
    
    // Process remaining nodes, prioritizing input order for level assignment
    let currentLevel = 0
    
    while (placedNodes.size < animationNodesList.length && currentLevel < maxAnimationLevels - 1) {
      const currentLevelNodes = nodesByLevel.get(currentLevel) || []
      const candidatesForNextLevel = []
      
      // Get unplaced nodes in their original input order
      const unplacedNodes = animationNodesList.filter(nodeIdx => !placedNodes.has(nodeIdx))
      
      if (unplacedNodes.length === 0) break
      
      // For each unplaced node, calculate its "readiness score" for the next level
      const nodeReadinessScores = unplacedNodes.map(nodeIdx => {
        const inputOrder = animationNodesList.indexOf(nodeIdx)
        let connectionScore = 0
        let hasAnyConnection = false
        
        // Check connections to current level nodes
        currentLevelNodes.forEach(levelNodeIdx => {
          const directForward = hasDirectConnection(levelNodeIdx, nodeIdx, causalLinksCount)
          const directBackward = hasDirectConnection(nodeIdx, levelNodeIdx, causalLinksCount)
          
          if (directForward || directBackward) {
            connectionScore += 3 // Strong direct connection
            hasAnyConnection = true
          }
        })
        
        // Check connections to any already placed nodes (not just current level)
        Array.from(placedNodes).forEach(placedNodeIdx => {
          if (currentLevelNodes.includes(placedNodeIdx)) return // Already counted above
          
          const directForward = hasDirectConnection(placedNodeIdx, nodeIdx, causalLinksCount)
          const directBackward = hasDirectConnection(nodeIdx, placedNodeIdx, causalLinksCount)
          
          if (directForward || directBackward) {
            connectionScore += 1 // Connection to earlier placed node
            hasAnyConnection = true
          }
        })
        
        // Bias heavily towards input order - later nodes should appear later
        const orderPenalty = inputOrder * 10 // Heavy penalty for appearing too early
        
        // Final readiness score (lower is better for earlier placement)
        const readinessScore = orderPenalty - connectionScore
        
        return {
          nodeIdx,
          inputOrder,
          connectionScore,
          hasAnyConnection,
          readinessScore
        }
      })
      
      // Sort by readiness score and input order
      nodeReadinessScores.sort((a, b) => {
        if (a.readinessScore !== b.readinessScore) {
          return a.readinessScore - b.readinessScore
        }
        return a.inputOrder - b.inputOrder
      })
      
      // Select candidates for next level
      // Prioritize nodes with connections, but respect input order
      const nodesWithConnections = nodeReadinessScores.filter(node => node.hasAnyConnection)
      const nodesWithoutConnections = nodeReadinessScores.filter(node => !node.hasAnyConnection)
      
      if (nodesWithConnections.length > 0) {
        // Take the most ready nodes with connections (max 3 per level)
        candidatesForNextLevel.push(...nodesWithConnections.slice(0, 3).map(node => node.nodeIdx))
      } else if (nodesWithoutConnections.length > 0) {
        // If no connections available, take the earliest input nodes (max 2)
        candidatesForNextLevel.push(...nodesWithoutConnections.slice(0, 2).map(node => node.nodeIdx))
      }
      
      if (candidatesForNextLevel.length > 0) {
        currentLevel++
        nodesByLevel.set(currentLevel, candidatesForNextLevel)
        candidatesForNextLevel.forEach(nodeIdx => placedNodes.add(nodeIdx))
      } else {
        break
      }
    }
    
    // If there are still unplaced nodes and we've reached max levels, put them all in the last level
    const remainingNodes = animationNodesList.filter(nodeIdx => !placedNodes.has(nodeIdx))
    if (remainingNodes.length > 0 && currentLevel < maxAnimationLevels) {
      const lastLevel = nodesByLevel.get(currentLevel) || []
      lastLevel.push(...remainingNodes)
      nodesByLevel.set(currentLevel, lastLevel)
    }
    
    return nodesByLevel
  }

  const animationTreeLayout = buildAnimationTreeLayout(visibleAnimationNodes, currentStepImportanceData)

  // Helper function to get animation node position with stable positioning
  const getAnimationNodePosition = (nodeIdx, animationTreeLayout) => {
    // Find which level this node is in
    let nodeLevel = 0
    let nodeIndexInLevel = 0
    
    for (const [level, nodes] of animationTreeLayout.entries()) {
      const index = nodes.indexOf(nodeIdx)
      if (index !== -1) {
        nodeLevel = level
        nodeIndexInLevel = index
        break
      }
    }
    
    const numLevels = Math.max(1, animationTreeLayout.size)
    const nodesInLevel = animationTreeLayout.get(nodeLevel) || []
    
    // Use current container dimensions for centering horizontally
    const containerWidth = Math.max(800, containerRef.current?.clientWidth || 800)
    const animationCenterX = containerWidth / 2
    
    // Fixed layout spacing - never changes
    const animationLevelGapY = 140   // Fixed vertical gaps
    const animationNodeGapX = 180   // Fixed horizontal gaps
    const topPadding = 60           // Padding from top of viewport
    
    // Position first node near top, subsequent nodes grow from there
    let levelY
    if (treeDirection === 'outgoing') {
      // For outgoing: first level (0) at top with padding, subsequent levels grow downward
      levelY = topPadding + nodeLevel * animationLevelGapY
    } else {
      // For incoming: first level (0) positioned to allow upward growth
      // Position so that the tree grows upward from a reasonable starting point
      const treeHeight = (numLevels - 1) * animationLevelGapY
      levelY = topPadding + treeHeight - nodeLevel * animationLevelGapY
    }
    
    // Center nodes horizontally in their level with stable positioning
    const numNodesInLevel = Math.max(1, nodesInLevel.length)
    let x = animationCenterX // Default to center
    
    if (numNodesInLevel > 1) {
      const totalWidth = (numNodesInLevel - 1) * animationNodeGapX
      const startX = animationCenterX - totalWidth / 2
      x = startX + nodeIndexInLevel * animationNodeGapX
    }
    
    return { x, y: levelY }
  }

  // Prevent empty state flashing during animation by treating animation mode differently
  const shouldShowEmptyState = !isAnimating && (selectedIdx === null || selectedIdx === undefined || !chunksData.length)
  const shouldShowNoConnections = !isAnimating && !selectedPaths.length

  // NOW we can do conditional returns after all hooks
  if (shouldShowEmptyState) {
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
  
  if (shouldShowNoConnections || (treeLayout.size === 0 && !isAnimating)) {
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
  
  // Calculate required dimensions
  const width = visibleAnimationNodes.size > 0 ? 
    Math.max(800, containerRef.current?.clientWidth || 800) : // Animation mode: use container width
    Math.max(600, calculateRequiredWidth()) // Normal mode: calculate based on tree
  const height = visibleAnimationNodes.size > 0 ? 
    Math.max(600, containerRef.current?.clientHeight || 600) : // Animation mode: use container height
    Math.max(400, treeLayout.size * levelGapY + 200) // Normal mode: based on tree levels
  
  // Position nodes in a tree layout
  const nodePositions = new Map()
  const centerX = width / 2
  const startY = 120 // Start from top with padding
  
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
            
            {/* Simple CSS Animation for yellow shine effect */}
            <style>
              {`
                @keyframes shine {
                  0%, 100% { 
                    opacity: 0.3; 
                    stroke-width: 2; 
                    r: ${nodeW/2 + 8}; 
                  }
                  50% { 
                    opacity: 0.8; 
                    stroke-width: 4; 
                    r: ${nodeW/2 + 15}; 
                  }
                }
                
                @keyframes finishEmoji {
                  0%, 100% { 
                    opacity: 1; 
                    transform: scale(1.0);
                  }
                }
              `}
            </style>
          </defs>

          <g className="zoom-group">
            {/* Connections - render before nodes so they appear behind */}
            <g className="connections">
              {visibleAnimationNodes.size > 0 ? (
                // Animation mode: show real connections between visible animation nodes
                (() => {
                  // Use a stable connections approach - connections are determined when nodes first appear
                  // and don't change when new nodes are added later
                  const stableConnections = []
                  const animationNodesList = Array.from(visibleAnimationNodes).sort((a, b) => {
                    // Sort by the order they appeared (based on animationStepList if available)
                    const aIndex = animationStepList.indexOf(a)
                    const bIndex = animationStepList.indexOf(b)
                    if (aIndex !== -1 && bIndex !== -1) {
                      return aIndex - bIndex
                    }
                    return a - b
                  })
                  
                  // For each node, determine its connections only to nodes that appeared BEFORE it
                  animationNodesList.forEach((sourceNodeIdx, index) => {
                    const stepData = currentStepImportanceData.find(step => step.source_chunk_idx === sourceNodeIdx)
                    
                    if (stepData?.target_impacts) {
                      // Only consider connections to nodes that appeared before this one
                      const earlierNodes = animationNodesList.slice(0, index)
                      const allLaterNodes = animationNodesList.slice(index + 1)
                      
                      // Get connections to earlier nodes (backward connections)
                      const backwardConnections = stepData.target_impacts
                        .filter(impact => earlierNodes.includes(impact.target_chunk_idx))
                        .sort((a, b) => Math.abs(b.importance_score) - Math.abs(a.importance_score))
                        .slice(0, 2) // Max 2 backward connections
                      
                      // Get connections to later nodes (forward connections) 
                      const forwardConnections = stepData.target_impacts
                        .filter(impact => allLaterNodes.includes(impact.target_chunk_idx))
                        .sort((a, b) => Math.abs(b.importance_score) - Math.abs(a.importance_score))
                        .slice(0, 2) // Max 2 forward connections
                      
                      // Add backward connections (these are stable - connect to already visible nodes)
                      backwardConnections.forEach(impact => {
                        stableConnections.push({
                          sourceIdx: sourceNodeIdx,
                          targetIdx: impact.target_chunk_idx,
                          importance: Math.abs(impact.importance_score),
                          isMainConnection: true
                        })
                      })
                      
                      // Add forward connections (these will appear when target nodes become visible)
                      forwardConnections.forEach(impact => {
                        const targetNodeIdx = impact.target_chunk_idx
                        // Only show this connection if the target is actually visible
                        if (visibleAnimationNodes.has(targetNodeIdx)) {
                          stableConnections.push({
                            sourceIdx: sourceNodeIdx,
                            targetIdx: targetNodeIdx,
                            importance: Math.abs(impact.importance_score),
                            isMainConnection: true
                          })
                        }
                      })
                    }
                  })
                  
                  return stableConnections.map((connection, index) => {
                    const sourcePos = getAnimationNodePosition(connection.sourceIdx, animationTreeLayout)
                    const targetPos = getAnimationNodePosition(connection.targetIdx, animationTreeLayout)
                    
                    // Calculate direction and edge points
                    const dx = targetPos.x - sourcePos.x
                    const dy = targetPos.y - sourcePos.y
                    const distance = Math.sqrt(dx * dx + dy * dy)
                    
                    if (distance === 0) return null
                    
                    const unitX = dx / distance
                    const unitY = dy / distance
                    
                    // Start point (edge of source node)
                    const startX = sourcePos.x + unitX * (nodeW / 2)
                    const startY = sourcePos.y + unitY * (nodeH / 2)
                    
                    // End point (edge of target node)
                    const endX = targetPos.x - unitX * (nodeW / 2)
                    const endY = targetPos.y - unitY * (nodeH / 2)
                    
                    const pathData = `M ${startX} ${startY} L ${endX} ${endY}`
                    
                    // All connections have consistent styling for simplicity
                    const opacity = 0.7
                    const strokeWidth = 2
                    const stroke = "#666"
                    
                    return (
                      <path
                        key={`animation-connection-${connection.sourceIdx}-${connection.targetIdx}-${index}`}
                        d={pathData}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        fill="none"
                        opacity={opacity}
                        markerEnd="url(#arrow)"
                        style={{ pointerEvents: 'none' }}
                      />
                    )
                  }).filter(Boolean)
                })()
              ) : (
                // Normal mode: show tree connections
                uniqueConnections.map((connection) => {
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
                })
              )}
            </g>

            {/* Nodes - render after connections so they appear on top */}
            <g className="nodes">
              {visibleAnimationNodes.size > 0 ? (
                // Animation mode: show only specified animation nodes in proper tree layout
                (() => {
                  const animationNodesList = Array.from(visibleAnimationNodes)
                  if (animationNodesList.length === 0) return null
                  
                  // Build a mini tree layout just for animation nodes
                  const animationTreeLayout = buildAnimationTreeLayout(animationNodesList, currentStepImportanceData)
                  
                  return Array.from(animationTreeLayout.entries()).map(([levelIndex, level]) => {
                    if (!level || !Array.isArray(level)) return null
                    
                    return (
                      <g key={`animation-level-${levelIndex}`}>
                        {level.map((nodeIdx) => {
                          const chunk = chunksData[nodeIdx]
                          if (!chunk) return null
                          
                          const pos = getAnimationNodePosition(nodeIdx, animationTreeLayout)
                          
                          // Calculate node opacity based on importance
                          const nodeImportance = chunk.importance !== undefined ? Math.abs(chunk.importance) : 0.5
                          const nodeOpacity = Math.max(0.4, Math.min(1.0, nodeImportance * 0.7 + 0.3))

                          // Check if this is the final step (when animation is complete)
                          const isAnimationComplete = isAnimating && animationStepList.length > 0 && visibleAnimationNodes.size === animationStepList.length
                          const isFinalNode = nodeIdx === animationStepList[animationStepList.length - 1]
                          
                          // Show shine effect ONLY for the newest node (last one added)
                          const newestNodeIndex = Array.from(visibleAnimationNodes).findIndex(n => n === nodeIdx)
                          const isNewestNode = isAnimating && newestNodeIndex === visibleAnimationNodes.size - 1

                          return (
                            <g key={`animation-node-${nodeIdx}`}>
                              {/* Yellow shine effect for ONLY the newest node */}
                              {isNewestNode && (
                                <circle
                                  cx={pos.x}
                                  cy={pos.y}
                                  r={nodeW/2 + 10}
                                  fill="none"
                                  stroke="#ffd700"
                                  strokeWidth="3"
                                  opacity="0.8"
                                  style={{
                                    animation: 'shine 2s ease-in-out infinite'
                                  }}
                                />
                              )}
                              
                              {/* Finish line emojis only when animation is complete and this is the final node */}
                              {isAnimationComplete && isFinalNode && (
                                <g style={{ zIndex: 9999 }}>
                                  {/* Top emoji */}
                                  <text
                                    x={pos.x}
                                    y={pos.y - 60}
                                    fontSize="24"
                                    textAnchor="middle"
                                    style={{
                                      animation: 'finishEmoji 5s ease-in-out forwards',
                                      animationDelay: '0s',
                                      zIndex: 9999
                                    }}
                                  >
                                    🏁
                                  </text>
                                  {/* Right emoji */}
                                  <text
                                    x={pos.x + 60}
                                    y={pos.y + 5}
                                    fontSize="24"
                                    textAnchor="middle"
                                    style={{
                                      animation: 'finishEmoji 5s ease-in-out forwards',
                                      animationDelay: '0.5s',
                                      zIndex: 9999
                                    }}
                                  >
                                    🏁
                                  </text>
                                  {/* Bottom emoji */}
                                  <text
                                    x={pos.x}
                                    y={pos.y + 70}
                                    fontSize="24"
                                    textAnchor="middle"
                                    style={{
                                      animation: 'finishEmoji 5s ease-in-out forwards',
                                      animationDelay: '1s',
                                      zIndex: 9999
                                    }}
                                  >
                                    🏁
                                  </text>
                                  {/* Left emoji */}
                                  <text
                                    x={pos.x - 60}
                                    y={pos.y + 5}
                                    fontSize="24"
                                    textAnchor="middle"
                                    style={{
                                      animation: 'finishEmoji 5s ease-in-out forwards',
                                      animationDelay: '1.5s',
                                      zIndex: 9999
                                    }}
                                  >
                                    🏁
                                  </text>
                                </g>
                              )}
                              
                              <Node
                                node={{ idx: nodeIdx }}
                                pos={pos}
                                chunk={chunk}
                                isSelected={nodeIdx === selectedIdx}
                                nodeW={nodeW}
                                nodeH={nodeH}
                                opacity={nodeOpacity}
                                isShining={isNewestNode}
                                onNodeHover={(event, nodeData) => {
                                  if (onNodeHover) {
                                    onNodeHover(event, nodeData)
                                  }
                                }}
                                onNodeLeave={onNodeLeave}
                                onNodeClick={onNodeClick}
                              />
                            </g>
                          )
                        })}
                      </g>
                    )
                  })
                })()
              ) : (
                // Normal mode: show tree layout
                Array.from(treeLayout.entries()).map(([levelIndex, level]) => {
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
                            onNodeHover={(event, nodeData) => {
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
                })
              )}
            </g>
          </g>
        </svg>
      </div>
    </div>
  )
} 



