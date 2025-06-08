'use client'
import { useState, useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { functionTagColors, formatFunctionTag } from '@/constants/visualization'
import { processMathText } from '@/utils/textProcessing'
import ChainOfThought from './ChainOfThought'
import {
    VisualizerWrapper,
    GraphContainer,
    ProblemBox,
    DetailPanel,
    LoadingIndicator,
    Legend,
    LegendRow,
    LegendItem,
    HoverTooltip,
    NavigationControls,
    NavButton,
} from '@/styles/visualization'

// Collapsible section component for the detail panel
const CollapsibleSection = ({ title, children, content, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen)
    
    return (
        <div style={{ border: '1px solid #ddd', borderRadius: '6px', overflow: 'hidden' }}>
            <div 
                style={{
                    padding: '0.75rem',
                    background: '#f8f9fa',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: isOpen ? '1px solid #ddd' : 'none'
                }}
                onClick={() => setIsOpen(!isOpen)}
            >
                <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>{title}</h4>
                <span style={{ fontSize: '0.875rem', color: '#666' }}>
                    {isOpen ? '−' : '+'}
                </span>
            </div>
            {isOpen && (
                <div style={{ padding: '0.75rem' }}>
                    {content || children}
                </div>
            )}
        </div>
    )
}

const ProblemVisualizer = ({ problemId, causalLinksCount, nodeHighlightColor = '#333', nodeHighlightWidth = 2.5 }) => {
    const [problemData, setProblemData] = useState(null)
    const [chunksData, setChunksData] = useState([])
    const [stepImportanceData, setStepImportanceData] = useState([])
    const [summaryData, setSummaryData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [selectedNode, setSelectedNode] = useState(null)
    const [hoveredNode, setHoveredNode] = useState(null)
    const [hoveredFromCentralGraph, setHoveredFromCentralGraph] = useState(false)
    const [resampledChunks, setResampledChunks] = useState({})
    const [isPanelOpen, setIsPanelOpen] = useState(false)
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' })
    const [normalizedWeights, setNormalizedWeights] = useState(new Map())
    const svgRef = useRef(null)
    const graphContainerRef = useRef(null)

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                if (!problemId) {
                    throw new Error('Problem ID is undefined')
                }

                // Fetch chunks data
                const chunksResponse = await import(`../../app/data/${problemId}/chunks_labeled.json`)
                setChunksData(chunksResponse.default)

                // Fetch step importance data
                const stepImportanceResponse = await import(
                    `../../app/data/${problemId}/step_importance.json`
                )
                setStepImportanceData(stepImportanceResponse.default)

                // Fetch summary data
                const summaryResponse = await import(`../../app/data/${problemId}/summary.json`)
                setSummaryData(summaryResponse.default)

                // Fetch problem data
                try {
                    const problemResponse = await import(`../../app/data/${problemId}/problem.json`)
                    setProblemData(problemResponse.default)
                } catch (e) {
                    console.warn(`Problem data not found for ${problemId}`)
                }

                setLoading(false)
            } catch (error) {
                console.error('Error fetching data:', error)
                setLoading(false)
            }
        }

        fetchData()
    }, [problemId])

    // Normalize connection weights
    useEffect(() => {
        if (stepImportanceData.length > 0) {
            const weightMap = new Map()
            
            stepImportanceData.forEach((step) => {
                const sourceIdx = step.source_chunk_idx
                const impacts = step.target_impacts || []
                
                // Calculate sum of absolute values for normalization
                const totalWeight = impacts.reduce((sum, impact) => 
                    sum + Math.abs(impact.importance_score), 0)
                
                if (totalWeight > 0) {
                    impacts.forEach((impact) => {
                        const normalizedWeight = Math.abs(impact.importance_score) / totalWeight
                        const key = `${sourceIdx}-${impact.target_chunk_idx}`
                        weightMap.set(key, normalizedWeight)
                    })
                }
            })
            
            setNormalizedWeights(weightMap)
        }
    }, [stepImportanceData])

    // Add useEffect to handle connection highlighting for selected node
    useEffect(() => {
        if (selectedNode && svgRef.current) {
            const svg = d3.select(svgRef.current)
            const links = svg.selectAll('.links path')
            
            // Get top-k incoming and outgoing connections
            const getTopOutgoingConnections = (nodeId, k) => {
                const stepData = stepImportanceData.find(step => step.source_chunk_idx === nodeId)
                if (!stepData?.target_impacts) return []
                
                return stepData.target_impacts
                    .sort((a, b) => Math.abs(b.importance_score) - Math.abs(a.importance_score))
                    .slice(0, k)
                    .map(impact => impact.target_chunk_idx)
            }

            const getTopIncomingConnections = (nodeId, k) => {
                const incomingConnections = []
                
                stepImportanceData.forEach(step => {
                    const impact = step.target_impacts?.find(impact => impact.target_chunk_idx === nodeId)
                    if (impact) {
                        incomingConnections.push({
                            sourceId: step.source_chunk_idx,
                            importance: impact.importance_score
                        })
                    }
                })
                
                return incomingConnections
                    .sort((a, b) => Math.abs(b.importance) - Math.abs(a.importance))
                    .slice(0, k)
                    .map(conn => conn.sourceId)
            }
            
            const topOutgoing = getTopOutgoingConnections(selectedNode.id, causalLinksCount)
            const topIncoming = getTopIncomingConnections(selectedNode.id, causalLinksCount)
            
            // Apply connection highlighting for selected node
            links.attr('opacity', (d) => {
                if (d.type === 'sequential') {
                    // Show sequential connections if they involve the selected node
                    if (d.source.id === selectedNode.id || d.target.id === selectedNode.id) return 0.9
                    return 0.1
                }
                
                // For causal connections, check if it's in top-k incoming or outgoing
                const isOutgoing = d.source.id === selectedNode.id && topOutgoing.includes(d.target.id)
                const isIncoming = d.target.id === selectedNode.id && topIncoming.includes(d.source.id)
                
                if (isOutgoing) {
                    // Get the raw importance score for this specific connection
                    const stepData = stepImportanceData.find(step => step.source_chunk_idx === selectedNode.id)
                    const impact = stepData?.target_impacts?.find(impact => impact.target_chunk_idx === d.target.id)
                    const rawImportance = impact ? Math.abs(impact.importance_score) : 0
                    return Math.max(0.3, rawImportance * 4)
                } else if (isIncoming) {
                    // Get the raw importance score for this specific connection
                    const stepData = stepImportanceData.find(step => step.source_chunk_idx === d.source.id)
                    const impact = stepData?.target_impacts?.find(impact => impact.target_chunk_idx === selectedNode.id)
                    const rawImportance = impact ? Math.abs(impact.importance_score) : 0
                    return Math.max(0.3, rawImportance * 4)
                }
                return 0.1
            })
            .attr('stroke', (d) => {
                if (d.type === 'sequential') return '#333'
                
                // Make highlighted causal connections more visible
                const isOutgoing = d.source.id === selectedNode.id && topOutgoing.includes(d.target.id)
                const isIncoming = d.target.id === selectedNode.id && topIncoming.includes(d.source.id)
                
                if (isOutgoing) {
                    return '#dc3545' // Red for outgoing connections
                } else if (isIncoming) {
                    return '#28a745' // Green for incoming connections
                }
                return '#999' // Default causal color
            })
            
            // Also highlight the selected node with red circle
            svg.selectAll('.nodes g')
                .selectAll('circle')
                .attr('stroke', (d) => d.id === selectedNode.id ? nodeHighlightColor : '#fff')
                .attr('stroke-width', (d) => d.id === selectedNode.id ? nodeHighlightWidth : 2)
        } else if (svgRef.current) {
            // Reset highlighting when no node is selected
            const svg = d3.select(svgRef.current)
            const links = svg.selectAll('.links path')
            
            links.attr('opacity', (d) => {
                if (d.type === 'sequential') return 0.8
                return Math.min(0.8, Math.max(0.2, d.weight * 2))
            })
            .attr('stroke', (d) => (d.type === 'sequential' ? '#333' : '#999'))
            
            svg.selectAll('.nodes g')
                .selectAll('circle')
                .attr('stroke', '#fff')
                .attr('stroke-width', 2)
        }
    }, [selectedNode, normalizedWeights, causalLinksCount, stepImportanceData])

    // Add useEffect to handle connection highlighting for hoveredNode (when no node is selected)
    useEffect(() => {
        if (hoveredNode && !selectedNode && svgRef.current) {
            const svg = d3.select(svgRef.current)
            const links = svg.selectAll('.links path')
            
            // Get top-k incoming and outgoing connections
            const getTopOutgoingConnections = (nodeId, k) => {
                const stepData = stepImportanceData.find(step => step.source_chunk_idx === nodeId)
                if (!stepData?.target_impacts) return []
                
                return stepData.target_impacts
                    .sort((a, b) => Math.abs(b.importance_score) - Math.abs(a.importance_score))
                    .slice(0, k)
                    .map(impact => impact.target_chunk_idx)
            }

            const getTopIncomingConnections = (nodeId, k) => {
                const incomingConnections = []
                
                stepImportanceData.forEach(step => {
                    const impact = step.target_impacts?.find(impact => impact.target_chunk_idx === nodeId)
                    if (impact) {
                        incomingConnections.push({
                            sourceId: step.source_chunk_idx,
                            importance: impact.importance_score
                        })
                    }
                })
                
                return incomingConnections
                    .sort((a, b) => Math.abs(b.importance) - Math.abs(a.importance))
                    .slice(0, k)
                    .map(conn => conn.sourceId)
            }
            
            const topOutgoing = getTopOutgoingConnections(hoveredNode.id, causalLinksCount)
            const topIncoming = getTopIncomingConnections(hoveredNode.id, causalLinksCount)
            
            // Apply connection highlighting for hovered node
            links.attr('opacity', (d) => {
                if (d.type === 'sequential') {
                    // Show sequential connections if they involve the hovered node
                    if (d.source.id === hoveredNode.id || d.target.id === hoveredNode.id) return 0.9
                    return 0.1
                }
                
                // For causal connections, check if it's in top-k incoming or outgoing
                const isOutgoing = d.source.id === hoveredNode.id && topOutgoing.includes(d.target.id)
                const isIncoming = d.target.id === hoveredNode.id && topIncoming.includes(d.source.id)
                
                if (isOutgoing) {
                    // Get the raw importance score for this specific connection
                    const stepData = stepImportanceData.find(step => step.source_chunk_idx === hoveredNode.id)
                    const impact = stepData?.target_impacts?.find(impact => impact.target_chunk_idx === d.target.id)
                    const rawImportance = impact ? Math.abs(impact.importance_score) : 0
                    return Math.max(0.3, rawImportance * 4)
                } else if (isIncoming) {
                    // Get the raw importance score for this specific connection
                    const stepData = stepImportanceData.find(step => step.source_chunk_idx === d.source.id)
                    const impact = stepData?.target_impacts?.find(impact => impact.target_chunk_idx === hoveredNode.id)
                    const rawImportance = impact ? Math.abs(impact.importance_score) : 0
                    return Math.max(0.3, rawImportance * 4)
                }
                return 0.1
            })
            .attr('stroke', (d) => {
                if (d.type === 'sequential') return '#333'
                
                // Make highlighted causal connections more visible
                const isOutgoing = d.source.id === hoveredNode.id && topOutgoing.includes(d.target.id)
                const isIncoming = d.target.id === hoveredNode.id && topIncoming.includes(d.source.id)
                
                if (isOutgoing) {
                    return '#dc3545' // Red for outgoing connections
                } else if (isIncoming) {
                    return '#28a745' // Green for incoming connections
                }
                return '#999' // Default causal color
            })
            
            // Also highlight the hovered node with red circle
            svg.selectAll('.nodes g')
                .selectAll('circle')
                .attr('stroke', (d) => d.id === hoveredNode.id ? nodeHighlightColor : '#fff')
                .attr('stroke-width', (d) => d.id === hoveredNode.id ? nodeHighlightWidth : 2)
        } else if (!selectedNode && svgRef.current) {
            // Reset highlighting when no node is hovered and no node is selected
            const svg = d3.select(svgRef.current)
            const links = svg.selectAll('.links path')
            
            links.attr('opacity', (d) => {
                if (d.type === 'sequential') return 0.8
                return Math.min(0.8, Math.max(0.2, d.weight * 2))
            })
            .attr('stroke', (d) => (d.type === 'sequential' ? '#333' : '#999'))
            
            // Reset node highlighting
            svg.selectAll('.nodes g')
                .selectAll('circle')
                .attr('stroke', '#fff')
                .attr('stroke-width', 2)
        }
    }, [hoveredNode, selectedNode, normalizedWeights, causalLinksCount, stepImportanceData])

    // Add click-outside handler
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check if the click target is a node circle or any part of the SVG that represents a node
            const isNodeClick = event.target.closest('.nodes') || 
                               event.target.tagName === 'circle' ||
                               event.target.tagName === 'text'
            
            // Also check if click is inside the detail panel (right column)
            const detailPanel = event.target.closest('[class*="DetailPanel"]')
            
            // Only close if it's not a node click and not in the detail panel
            if (!isNodeClick && !detailPanel && selectedNode) {
                setSelectedNode(null)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [selectedNode])

    // Create a separate useEffect for initial graph rendering
    useEffect(() => {
        if (!loading && chunksData.length > 0 && stepImportanceData.length > 0) {
            renderGraph()
        }
    }, [loading, chunksData, stepImportanceData, causalLinksCount, normalizedWeights, selectedNode])

    // Add a new useEffect to fetch resampled chunks
    useEffect(() => {
        const fetchResampledChunks = async () => {
            try {
                const resampledChunksResponse = await import(
                    `../../app/data/${problemId}/chunks_resampled.json`
                )
                setResampledChunks(resampledChunksResponse.default)
            } catch (error) {
                console.error('Error fetching resampled chunks:', error)
            }
        }

        if (problemId) {
            fetchResampledChunks()
        }
    }, [problemId])

    // Update isPanelOpen when selectedNode changes
    useEffect(() => {
        setIsPanelOpen(selectedNode !== null)
    }, [selectedNode])

    const renderGraph = () => {
        if (!svgRef.current) return

        // Clear previous graph
        d3.select(svgRef.current).selectAll('*').remove()

        const width = svgRef.current.clientWidth
        const height = svgRef.current.clientHeight

        // Create SVG
        const svg = d3.select(svgRef.current).attr('width', width).attr('height', height)

        // Add zoom functionality
        const zoom = d3
            .zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform)
            })

        svg.call(zoom)

        // Create a group for the graph
        const g = svg.append('g')

        // Create nodes data with improved sizing
        const nodes = chunksData.map((chunk) => {
            const importance = Math.abs(chunk.importance) || 0.01
            return {
                id: chunk.chunk_idx,
                text: chunk.chunk,
                functionTag: chunk.function_tags[0],
                importance: importance,
                dependsOn: chunk.depends_on,
                // Dynamic radius based on importance (more significant variation)
                radius: Math.max(10, Math.min(25, 8 + importance * 40)),
                // Color intensity based on importance
                colorIntensity: Math.min(1, Math.max(0.6, importance * 3))
            }
        })

        // Sort nodes by ID to ensure proper ordering
        nodes.sort((a, b) => a.id - b.id)

        // Create links data for sequential connections
        const sequentialLinks = []
        for (let i = 0; i < nodes.length - 1; i++) {
            sequentialLinks.push({
                source: nodes[i].id,
                target: nodes[i + 1].id,
                type: 'sequential',
                weight: 1
            })
        }

        // Create links data for causal influences with normalized weights
        const causalLinks = []
        const existingLinks = new Set() // Track existing links to avoid duplicates
        
        // Add outgoing connections for all nodes
        stepImportanceData.forEach((step) => {
            const sourceIdx = step.source_chunk_idx

            // Sort target impacts by importance score and take top-N based on user selection
            const topTargets = [...(step.target_impacts || [])]
                .sort((a, b) => Math.abs(b.importance_score) - Math.abs(a.importance_score))
                .slice(0, causalLinksCount)

            topTargets.forEach((target) => {
                const key = `${sourceIdx}-${target.target_chunk_idx}`
                const linkKey = `${sourceIdx}-${target.target_chunk_idx}`
                
                if (!existingLinks.has(linkKey)) {
                    const normalizedWeight = normalizedWeights.get(key) || 0
                    
                    causalLinks.push({
                        source: sourceIdx,
                        target: target.target_chunk_idx,
                        weight: normalizedWeight,
                        rawWeight: Math.abs(target.importance_score),
                        type: 'causal',
                    })
                    existingLinks.add(linkKey)
                }
            })
        })
        
        // Add top-k incoming connections for all nodes
        nodes.forEach(node => {
            const topIncoming = []
            stepImportanceData.forEach(step => {
                const impact = step.target_impacts?.find(impact => impact.target_chunk_idx === node.id)
                if (impact) {
                    topIncoming.push({
                        sourceId: step.source_chunk_idx,
                        importance: impact.importance_score
                    })
                }
            })
            
            const topIncomingConnections = topIncoming
                .sort((a, b) => Math.abs(b.importance) - Math.abs(a.importance))
                .slice(0, causalLinksCount)
            
            topIncomingConnections.forEach(conn => {
                const linkKey = `${conn.sourceId}-${node.id}`
                if (!existingLinks.has(linkKey)) {
                    const key = `${conn.sourceId}-${node.id}`
                    const normalizedWeight = normalizedWeights.get(key) || 0
                    
                    causalLinks.push({
                        source: conn.sourceId,
                        target: node.id,
                        weight: normalizedWeight,
                        rawWeight: Math.abs(conn.importance),
                        type: 'causal',
                    })
                    existingLinks.add(linkKey)
                }
            })
        })

        // Combine all links
        const links = [...sequentialLinks, ...causalLinks]

        // Position nodes in a circle
        const nodeCount = nodes.length
        const radius = Math.min(width, height) * 0.35

        // Position nodes in a circle starting from the top (0 degrees)
        nodes.forEach((node, i) => {
            const angle = (i / nodeCount) * 2 * Math.PI - Math.PI / 2

            // Shift center left by 30% when detail panel is open
            const centerX = selectedNode ? width / 2 - width * 0.15 : width / 2
            const centerY = height / 2

            // Set fixed positions in a circle
            node.fx = centerX + radius * Math.cos(angle)
            node.fy = centerY + radius * Math.sin(angle)
            node.angle = angle
        })

        // Create force simulation with minimal forces since we're using fixed positions
        const simulation = d3
            .forceSimulation(nodes)
            .force('link', d3.forceLink(links).id((d) => d.id))
            .force('charge', d3.forceManyBody().strength(-5))
            .alphaDecay(0.1)

        // Add definitions for arrows and gradients
        const defs = svg.append('defs')
        
        // Arrow markers for sequential connections
        defs.append('marker')
            .attr('id', 'arrow-sequential')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 8)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#333')

        // Arrow markers for causal connections
        defs.append('marker')
            .attr('id', 'arrow-causal')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 8)
            .attr('refY', 0)
            .attr('markerWidth', 5)
            .attr('markerHeight', 5)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#999')

        // Middle arrow markers for sequential connections
        defs.append('marker')
            .attr('id', 'arrow-sequential-mid')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 5)
            .attr('refY', 0)
            .attr('markerWidth', 8)
            .attr('markerHeight', 8)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#333')

        // Middle arrow markers for causal connections
        defs.append('marker')
            .attr('id', 'arrow-causal-mid')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 5)
            .attr('refY', 0)
            .attr('markerWidth', 8)
            .attr('markerHeight', 8)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#999')

        // Create links with improved styling
        const link = g
            .append('g')
            .attr('class', 'links')
            .selectAll('path')
            .data(links)
            .enter()
            .append('path')
            .attr('stroke-width', 2) // Constant stroke width for all links
            .attr('stroke', (d) => (d.type === 'sequential' ? '#333' : '#999'))
            .attr('stroke-dasharray', (d) => (d.type === 'sequential' ? '0' : '3,3'))
            .attr('fill', 'none')
            .attr('opacity', (d) => {
                if (d.type === 'sequential') return 0.8
                return Math.min(0.8, Math.max(0.2, d.weight * 2))
            })
            .attr('marker-end', (d) => d.type === 'sequential' ? 'url(#arrow-sequential)' : 'url(#arrow-causal)')
            .attr('marker-mid', (d) => d.type === 'sequential' ? 'url(#arrow-sequential-mid)' : 'url(#arrow-causal-mid)')
            .style('cursor', 'pointer')

        // Function to get top-k outgoing connections for a node
        const getTopOutgoingConnections = (nodeId, k) => {
            const stepData = stepImportanceData.find(step => step.source_chunk_idx === nodeId)
            if (!stepData?.target_impacts) return []
            
            return stepData.target_impacts
                .sort((a, b) => Math.abs(b.importance_score) - Math.abs(a.importance_score))
                .slice(0, k)
                .map(impact => impact.target_chunk_idx)
        }

        // Function to get top-k incoming connections for a node
        const getTopIncomingConnections = (nodeId, k) => {
            const incomingConnections = []
            
            stepImportanceData.forEach(step => {
                const impact = step.target_impacts?.find(impact => impact.target_chunk_idx === nodeId)
                if (impact) {
                    incomingConnections.push({
                        sourceId: step.source_chunk_idx,
                        importance: impact.importance_score
                    })
                }
            })
            
            return incomingConnections
                .sort((a, b) => Math.abs(b.importance) - Math.abs(a.importance))
                .slice(0, k)
                .map(conn => conn.sourceId)
        }

        // Create nodes with improved styling
        const node = g
            .append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(nodes)
            .enter()
            .append('g')
            .attr('transform', (d) => `translate(${d.fx},${d.fy})`)

        // Add circles to nodes with dynamic sizing and color intensity
        node.append('circle')
            .attr('r', (d) => d.radius)
            .attr('fill', (d) => {
                const baseColor = functionTagColors[d.functionTag] || '#999'
                // Apply color intensity based on importance
                const rgb = d3.color(baseColor).rgb()
                return d3.rgb(
                    Math.round(rgb.r * d.colorIntensity + 255 * (1 - d.colorIntensity)),
                    Math.round(rgb.g * d.colorIntensity + 255 * (1 - d.colorIntensity)),
                    Math.round(rgb.b * d.colorIntensity + 255 * (1 - d.colorIntensity))
                ).toString()
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => {
                handleNodeHover(event, d)
            })
            .on('mouseout', (event, d) => {
                handleNodeLeave()
            })
            .on('click', (event, d) => {
                handleNodeClick(d)
            })

        // Add labels to nodes with dynamic font sizes
        node.append('text')
            .text((d) => d.id)
            .attr('font-size', (d) => `${Math.max(10, d.radius * 0.6)}px`)
            .attr('text-anchor', 'middle')
            .attr('dy', '.35em')
            .attr('fill', '#fff')
            .attr('font-weight', 'bold')
            .style('pointer-events', 'none')
            .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.5)')

        // Store references for highlighting
        svg.selectAll('.nodes').data(nodes)
        svg.selectAll('.links').data(links)

        // Update link positions
        simulation.on('tick', () => {
            link.attr('d', (d) => `M${d.source.fx},${d.source.fy}L${d.target.fx},${d.target.fy}`)
        })

        // Run simulation briefly to stabilize
        simulation.tick(10)
        
        // Apply selectedNode highlighting immediately if a node is selected
        if (selectedNode) {
            const topOutgoing = getTopOutgoingConnections(selectedNode.id, causalLinksCount)
            const topIncoming = getTopIncomingConnections(selectedNode.id, causalLinksCount)
            
            // Apply connection highlighting for selected node
            link.attr('opacity', (d) => {
                if (d.type === 'sequential') {
                    // Show sequential connections if they involve the selected node
                    if (d.source.id === selectedNode.id || d.target.id === selectedNode.id) return 0.9
                    return 0.1
                }
                
                // For causal connections, check if it's in top-k incoming or outgoing
                const isOutgoing = d.source.id === selectedNode.id && topOutgoing.includes(d.target.id)
                const isIncoming = d.target.id === selectedNode.id && topIncoming.includes(d.source.id)
                
                if (isOutgoing) {
                    // Get the raw importance score for this specific connection
                    const stepData = stepImportanceData.find(step => step.source_chunk_idx === selectedNode.id)
                    const impact = stepData?.target_impacts?.find(impact => impact.target_chunk_idx === d.target.id)
                    const rawImportance = impact ? Math.abs(impact.importance_score) : 0
                    return Math.max(0.3, rawImportance * 4)
                } else if (isIncoming) {
                    // Get the raw importance score for this specific connection
                    const stepData = stepImportanceData.find(step => step.source_chunk_idx === d.source.id)
                    const impact = stepData?.target_impacts?.find(impact => impact.target_chunk_idx === selectedNode.id)
                    const rawImportance = impact ? Math.abs(impact.importance_score) : 0
                    return Math.max(0.3, rawImportance * 4)
                }
                return 0.1
            })
            .attr('stroke', (d) => {
                if (d.type === 'sequential') return '#333'
                
                // Make highlighted causal connections more visible
                const isOutgoing = d.source.id === selectedNode.id && topOutgoing.includes(d.target.id)
                const isIncoming = d.target.id === selectedNode.id && topIncoming.includes(d.source.id)
                
                if (isOutgoing) {
                    return '#dc3545' // Red for outgoing connections
                } else if (isIncoming) {
                    return '#28a745' // Green for incoming connections
                }
                return '#999' // Default causal color
            })
            
            // Also highlight the selected node with red circle
            node.selectAll('circle')
                .attr('stroke', (d) => d.id === selectedNode.id ? nodeHighlightColor : '#fff')
                .attr('stroke-width', (d) => d.id === selectedNode.id ? nodeHighlightWidth : 2)
        }
    }

    const handleNodeHover = (event, node) => {
        setHoveredNode(node)
        setHoveredFromCentralGraph(true)
        /* NOTE: Do not show tooltip here, the step is already visible on the left panel
        setTooltip({
            visible: true,
            x: event.pageX + 10,
            y: event.pageY - 10,
            content: `Step ${node.id}: ${formatFunctionTag(node.functionTag)} (${node.importance.toFixed(4)})`
        })
        */
        
        // Add red circle overlay to the hovered node
        if (svgRef.current) {
            d3.select(svgRef.current)
                .selectAll('.nodes g')
                .selectAll('circle')
                .attr('stroke', (d) => d.id === node.id ? nodeHighlightColor : '#fff')
                .attr('stroke-width', (d) => d.id === node.id ? nodeHighlightWidth : 2)
        }
    }

    const handleNodeLeave = () => {
        setHoveredNode(null)
        setHoveredFromCentralGraph(false)
        setTooltip({ visible: false, x: 0, y: 0, content: '' })
        
        // Only reset node highlighting if no node is selected
        if (!selectedNode && svgRef.current) {
            d3.select(svgRef.current)
                .selectAll('.nodes g')
                .selectAll('circle')
                .attr('stroke', '#fff')
                .attr('stroke-width', 2)
        }
    }

    const handleNodeClick = (node) => {
        setSelectedNode(node)
    }

    const handleStepHover = (chunk) => {
        const nodeData = {
            id: chunk.chunk_idx,
            text: chunk.chunk,
            functionTag: chunk.function_tags[0],
            importance: Math.abs(chunk.importance) || 0.01,
            dependsOn: chunk.depends_on,
        }
        setHoveredNode(nodeData)
        setHoveredFromCentralGraph(false)
    }

    const handleStepLeave = () => {
        setHoveredNode(null)
    }

    const handleStepClick = (chunk) => {
        const nodeData = {
            id: chunk.chunk_idx,
            text: chunk.chunk,
            functionTag: chunk.function_tags[0],
            importance: Math.abs(chunk.importance) || 0.01,
            dependsOn: chunk.depends_on,
        }
        setSelectedNode(nodeData)
    }

    // Get causal effects for a node
    const getCausalEffects = (nodeId) => {
        const effects = []
        const stepData = stepImportanceData.find((step) => step.source_chunk_idx === nodeId)

        if (stepData && stepData.target_impacts) {
            stepData.target_impacts.forEach((impact) => {
                const targetNode = chunksData.find(
                    (chunk) => chunk.chunk_idx === impact.target_chunk_idx,
                )
                if (targetNode) {
                    effects.push({
                        id: targetNode.chunk_idx,
                        functionTag: targetNode.function_tags[0],
                        importance: impact.importance_score,
                        text: targetNode.chunk,
                    })
                }
            })
        }

        return effects.sort((a, b) => Math.abs(b.importance) - Math.abs(a.importance))
    }

    // Get what affects this node (causally affected by)
    const getCausallyAffectedBy = (nodeId, limit = causalLinksCount) => {
        const affectedBy = []
        
        stepImportanceData.forEach((step) => {
            const impact = step.target_impacts?.find(impact => impact.target_chunk_idx === nodeId)
            if (impact) {
                const sourceNode = chunksData.find(chunk => chunk.chunk_idx === step.source_chunk_idx)
                if (sourceNode) {
                    affectedBy.push({
                        id: step.source_chunk_idx,
                        functionTag: sourceNode.function_tags[0],
                        importance: impact.importance_score,
                        text: sourceNode.chunk,
                    })
                }
            }
        })
        
        return affectedBy
            .sort((a, b) => Math.abs(b.importance) - Math.abs(a.importance))
            .slice(0, limit)
    }

    // Navigate to next or previous node
    const navigateToNode = (direction) => {
        if (!selectedNode) return

        const nodeIds = chunksData.map((chunk) => chunk.chunk_idx).sort((a, b) => a - b)
        const currentIndex = nodeIds.indexOf(selectedNode.id)

        if (direction === 'next' && currentIndex < nodeIds.length - 1) {
            const nextNodeId = nodeIds[currentIndex + 1]
            const nextNode = chunksData.find((chunk) => chunk.chunk_idx === nextNodeId)
            setSelectedNode({
                id: nextNode.chunk_idx,
                text: nextNode.chunk,
                functionTag: nextNode.function_tags[0],
                importance: Math.abs(nextNode.importance) || 0.01,
                dependsOn: nextNode.depends_on,
            })
        } else if (direction === 'prev' && currentIndex > 0) {
            const prevNodeId = nodeIds[currentIndex - 1]
            const prevNode = chunksData.find((chunk) => chunk.chunk_idx === prevNodeId)
            setSelectedNode({
                id: prevNode.chunk_idx,
                text: prevNode.chunk,
                functionTag: prevNode.function_tags[0],
                importance: Math.abs(prevNode.importance) || 0.01,
                dependsOn: prevNode.depends_on,
            })
        }
    }

    // Get top-3 different resampled sentences for a node
    const getTopResampledSentences = (nodeId) => {
        if (!resampledChunks || !resampledChunks[nodeId]) {
            return []
        }

        const originalText = chunksData.find((chunk) => chunk.chunk_idx === nodeId)?.chunk || ''
        const allResamples = resampledChunks[nodeId]

        // Filter out resamples that are identical to the original
        const differentResamples = allResamples.filter(
            (resample) => resample.trim() !== originalText.trim(),
        )

        // Group by text and count occurrences
        const counts = {}
        differentResamples.forEach((resample) => {
            counts[resample] = (counts[resample] || 0) + 1
        })

        // Sort by count (descending) and take top 3 different ones
        const topResamples = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([text]) => text)

        return topResamples
    }

    // In the DetailPanel component, add a useEffect to trigger MathJax typesetting
    useEffect(() => {
        if (selectedNode && window.MathJax) {
            // Use a small timeout to ensure the DOM has updated
            const timer = setTimeout(() => {
                try {
                    window.MathJax.typesetPromise && window.MathJax.typesetPromise()
                } catch (e) {
                    console.error('MathJax typesetting error:', e)
                }
            }, 100)

            return () => clearTimeout(timer)
        }
    }, [selectedNode])

    return (
        <div>
            {tooltip.visible && (
                <HoverTooltip style={{ left: tooltip.x, top: tooltip.y }}>
                    {tooltip.content}
                </HoverTooltip>
            )}
            
            {loading ? (
                <LoadingIndicator>Loading visualization data...</LoadingIndicator>
            ) : (
                <>
                    {summaryData && (
                        <ProblemBox>
                            <h3 style={{ marginBottom: '0.5rem' }}>
                                Problem {summaryData.problem_idx}
                            </h3>
                            {problemData && problemData.problem && (
                                <div
                                    style={{
                                        marginBottom: '0.5rem',
                                        flexDirection: 'row',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                    }}
                                >
                                    <p>
                                        <strong>Question:</strong>
                                    </p>
                                    <p>{processMathText(problemData.problem)}</p>
                                </div>
                            )}
                            {problemData && problemData.gt_answer && (
                                <div
                                    style={{
                                        marginBottom: '0.5rem',
                                        flexDirection: 'row',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '0.5rem',
                                    }}
                                >
                                    <p>
                                        <strong>Answer:</strong>
                                    </p>
                                    <p>{processMathText(problemData.gt_answer)}</p>
                                </div>
                            )}
                            <div
                                style={{
                                    marginBottom: '0.5rem',
                                    flexDirection: 'row',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '0.5rem',
                                }}
                            >
                                <p>
                                    <strong>Total steps:</strong>
                                </p>
                                <p>{summaryData.num_chunks}</p>
                            </div>
                        </ProblemBox>
                    )}

                    <Legend>
                        <h3 style={{ marginBottom: '0.25rem' }}>Visualization Legend</h3>
                        <LegendRow>
                            <LegendItem>
                                <svg width='30' height='10'>
                                    <line
                                        x1='0'
                                        y1='5'
                                        x2='30'
                                        y2='5'
                                        stroke='#333'
                                        strokeWidth='2'
                                    />
                                </svg>
                                <span>Sequential steps</span>
                            </LegendItem>
                            <LegendItem>
                                <svg width='30' height='10'>
                                    <line
                                        x1='0'
                                        y1='5'
                                        x2='30'
                                        y2='5'
                                        stroke='#999'
                                        strokeWidth='2'
                                        strokeDasharray='3,3'
                                    />
                                </svg>
                                <span>Causal influence</span>
                            </LegendItem>
                            <LegendItem>
                                <svg width='30' height='10'>
                                    <line
                                        x1='0'
                                        y1='5'
                                        x2='30'
                                        y2='5'
                                        stroke='#dc3545'
                                        strokeWidth='2'
                                        strokeDasharray='3,3'
                                    />
                                </svg>
                                <span>Outgoing connections (on hover)</span>
                            </LegendItem>
                            <LegendItem>
                                <svg width='30' height='10'>
                                    <line
                                        x1='0'
                                        y1='5'
                                        x2='30'
                                        y2='5'
                                        stroke='#28a745'
                                        strokeWidth='2'
                                        strokeDasharray='3,3'
                                    />
                                </svg>
                                <span>Incoming connections (on hover)</span>
                            </LegendItem>
                            <LegendItem>
                                <svg width='60' height='20'>
                                    <circle cx='10' cy='10' r='4' fill='#4285F4' />
                                    <circle cx='25' cy='10' r='6' fill='#4285F4' />
                                    <circle cx='45' cy='10' r='10' fill='#4285F4' />
                                </svg>
                                <span style={{ marginLeft: '8px' }}>
                                    Node size = importance
                                </span>
                            </LegendItem>
                        </LegendRow>
                        <LegendRow>
                            <div style={{ marginTop: '0.25rem' }}>
                                <div
                                    style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        rowGap: '0.5rem',
                                        columnGap: '1rem',
                                    }}
                                >
                                    {Object.entries(functionTagColors).map(([tag, color]) => (
                                        <div
                                            key={tag}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: '15px',
                                                    height: '15px',
                                                    backgroundColor: color,
                                                    borderRadius: '50%',
                                                }}
                                            ></div>
                                            <span>{formatFunctionTag(tag)} ({formatFunctionTag(tag, true)})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </LegendRow>
                    </Legend>

                    <VisualizerWrapper>
                        <ChainOfThought
                            chunksData={chunksData}
                            stepImportanceData={stepImportanceData}
                            selectedNode={selectedNode}
                            hoveredNode={hoveredNode}
                            onStepHover={handleStepHover}
                            onStepClick={handleStepClick}
                            onStepLeave={handleStepLeave}
                            causalLinksCount={causalLinksCount}
                            hoveredFromCentralGraph={hoveredFromCentralGraph}
                        />

                        <GraphContainer 
                            ref={graphContainerRef}
                        >
                            <svg ref={svgRef} width='100%' height='100%'></svg>
                        </GraphContainer>

                        <DetailPanel visible={selectedNode !== null ? 'true' : undefined}>
                            {selectedNode && (
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '1rem',
                                    }}
                                >
                                    <NavigationControls>
                                        <NavButton
                                            disabled={selectedNode.id <= Math.min(...chunksData.map(c => c.chunk_idx))}
                                            onClick={() => navigateToNode('prev')}
                                        >
                                            <p style={{ textAlign: 'center', fontSize: '0.9rem' }}>←&nbsp;&nbsp;Prev</p>
                                        </NavButton>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ textAlign: 'center', fontSize: '1rem', fontWeight: 600, color: '#444' }}>
                                                Step {selectedNode.id}
                                            </p>
                                        </div>
                                        <NavButton
                                            disabled={selectedNode.id >= Math.max(...chunksData.map(c => c.chunk_idx))}
                                            onClick={() => navigateToNode('next')}
                                        >
                                           <p style={{ textAlign: 'center', fontSize: '0.9rem' }}>Next&nbsp;&nbsp;→</p>
                                        </NavButton>
                                    </NavigationControls>

                                    {/* Main step container with background color matching left column */}
                                    <div
                                        style={{
                                            padding: '0.75rem',
                                            marginTop: '-0.5rem',
                                            borderRadius: '6px',
                                            borderLeft: `4px solid ${functionTagColors[selectedNode.functionTag] || '#999'}`,
                                            background: (() => {
                                                const color = functionTagColors[selectedNode.functionTag] || '#999'
                                                const opacity = Math.min(0.8, Math.max(0.1, selectedNode.importance * 2))
                                                return `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`
                                            })(),
                                            position: 'relative'
                                        }}
                                    >
                                        {/* Step number circle */}
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: '-8px',
                                                left: '-8px',
                                                background: functionTagColors[selectedNode.functionTag] || '#999',
                                                color: 'white',
                                                borderRadius: '50%',
                                                width: '24px',
                                                height: '24px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.75rem',
                                                fontWeight: 'bold',
                                                border: '2px solid white',
                                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                                            }}
                                        >
                                            {selectedNode.id}
                                        </div>
                                        
                                        {/* Function and Importance in containers like left column */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                color: '#444',
                                                background: 'rgba(255, 255, 255, 0.8)',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '12px',
                                                border: '1px solid rgba(0, 0, 0, 0.1)'
                                            }}>
                                                {formatFunctionTag(selectedNode.functionTag)}
                                            </span>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                color: '#666',
                                                background: 'rgba(255, 255, 255, 0.9)',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '4px',
                                                border: '1px solid rgba(0, 0, 0, 0.1)'
                                            }}>
                                                Importance: {selectedNode.importance.toFixed(4)}
                                            </span>
                                        </div>

                                        {/* Step text */}
                                        <div style={{
                                            fontSize: '0.875rem',
                                            lineHeight: 1.4,
                                            color: '#333',
                                            background: 'rgba(255, 255, 255, 0.9)',
                                            padding: '0.5rem',
                                            borderRadius: '4px',
                                            border: '1px solid rgba(0, 0, 0, 0.1)'
                                        }}>
                                            {processMathText(selectedNode.text)}
                                        </div>
                                    </div>

                                    {/* Resampled steps section - collapsible, closed by default */}
                                    <CollapsibleSection 
                                        title="Resampled steps" 
                                        defaultOpen={false}
                                        content={
                                            getTopResampledSentences(selectedNode.id).length > 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    {getTopResampledSentences(selectedNode.id).map((resample, index) => (
                                                        <div
                                                            key={index}
                                                            style={{
                                                                fontSize: '0.875rem',
                                                                lineHeight: 1.4,
                                                                color: '#333',
                                                                background: 'rgba(248, 249, 250, 0.9)',
                                                                padding: '0.5rem',
                                                                borderRadius: '4px',
                                                                border: '1px solid rgba(0, 0, 0, 0.1)'
                                                            }}
                                                        >
                                                            {processMathText(resample)}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p>This step seems overdetermined... No different resamples found in dataset.</p>
                                            )
                                        }
                                    />

                                    {/* Causally affected by section - collapsible, open by default */}
                                    {getCausallyAffectedBy(selectedNode.id).length > 0 && (
                                        <CollapsibleSection 
                                            title={`← Affected by (top-${causalLinksCount})`}
                                            defaultOpen={true}
                                            content={
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    {getCausallyAffectedBy(selectedNode.id).map((affector) => (
                                                        <div
                                                            key={affector.id}
                                                            style={{
                                                                padding: '0.5rem',
                                                                borderRadius: '4px',
                                                                borderLeft: `3px solid ${functionTagColors[affector.functionTag] || '#999'}`,
                                                                background: `${functionTagColors[affector.functionTag] || '#999'}20`,
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={() => {
                                                                const targetNode = chunksData.find(
                                                                    (chunk) => chunk.chunk_idx === affector.id,
                                                                )
                                                                if (targetNode) {
                                                                    setSelectedNode({
                                                                        id: targetNode.chunk_idx,
                                                                        text: targetNode.chunk,
                                                                        functionTag: targetNode.function_tags[0],
                                                                        importance: Math.abs(targetNode.importance) || 0.01,
                                                                        dependsOn: targetNode.depends_on,
                                                                    })
                                                                }
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                setTooltip({
                                                                    visible: true,
                                                                    x: e.pageX + 20,
                                                                    y: e.pageY - 20,
                                                                    content: processMathText(affector.text)
                                                                })
                                                            }}
                                                            onMouseLeave={() => {
                                                                setTooltip({ visible: false, x: 0, y: 0, content: '' })
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontWeight: 'bold', color: '#0066cc' }}>
                                                                    Step {affector.id} ({formatFunctionTag(affector.functionTag, true)})
                                                                </span>
                                                                <span style={{ fontSize: '0.75rem', color: '#666' }}>
                                                                    Importance: {affector.importance.toFixed(4)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            }
                                        />
                                    )}

                                    {/* Causal effects section - collapsible, open by default */}
                                    {getCausalEffects(selectedNode.id).slice(0, causalLinksCount).length > 0 && (
                                        <CollapsibleSection 
                                            title={`→ Affects (top-${causalLinksCount})`}
                                            defaultOpen={true}
                                            content={
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    {getCausalEffects(selectedNode.id)
                                                        .slice(0, causalLinksCount)
                                                        .map((effect) => (
                                                            <div
                                                                key={effect.id}
                                                                style={{
                                                                    padding: '0.5rem',
                                                                    borderRadius: '4px',
                                                                    borderLeft: `3px solid ${functionTagColors[effect.functionTag] || '#999'}`,
                                                                    background: `${functionTagColors[effect.functionTag] || '#999'}20`,
                                                                    cursor: 'pointer'
                                                                }}
                                                                onClick={() => {
                                                                    const targetNode = chunksData.find(
                                                                        (chunk) => chunk.chunk_idx === effect.id,
                                                                    )
                                                                    if (targetNode) {
                                                                        setSelectedNode({
                                                                            id: targetNode.chunk_idx,
                                                                            text: targetNode.chunk,
                                                                            functionTag: targetNode.function_tags[0],
                                                                            importance: Math.abs(targetNode.importance) || 0.01,
                                                                            dependsOn: targetNode.depends_on,
                                                                        })
                                                                    }
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    setTooltip({
                                                                        visible: true,
                                                                        x: e.pageX + 20,
                                                                        y: e.pageY - 20,
                                                                        content: processMathText(effect.text)
                                                                    })
                                                                }}
                                                                onMouseLeave={() => {
                                                                    setTooltip({ visible: false, x: 0, y: 0, content: '' })
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <span style={{ fontWeight: 'bold', color: '#0066cc' }}>
                                                                        Step {effect.id} ({formatFunctionTag(effect.functionTag, true)})
                                                                    </span>
                                                                    <span style={{ fontSize: '0.75rem', color: '#666' }}>
                                                                        Importance: {effect.importance.toFixed(4)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            }
                                        />
                                    )}

                                    <button
                                        onClick={() => setSelectedNode(null)}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            background: '#f0f0f0',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                            marginTop: '1rem',
                                            fontSize: '0.9rem',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Close
                                    </button>
                                </div>
                            )}
                        </DetailPanel>
                    </VisualizerWrapper>
                </>
            )}
        </div>
    )
}

export default ProblemVisualizer 