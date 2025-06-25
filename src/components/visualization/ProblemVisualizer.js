'use client'
import { useState, useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { functionTagColors, formatFunctionTag } from '@/constants/visualization'
import { processMathText } from '@/utils/textProcessing'
import ChainOfThought from './ChainOfThought'
import AttributionGraph from '@/components/attribution/AttributionGraph'
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
    VisualizationToggle,
    ToggleOption,
} from '@/styles/visualization'
import styled from 'styled-components'

const GraphControls = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 1rem;
    background: white;
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid #eee;
    z-index: 10;

    /* Mobile responsive graph controls */
    @media (max-width: 875px) {
        flex-direction: column;
        gap: 0.75rem;
        padding: 12px;
        align-items: stretch;
    }
    
    @media (max-width: 650px) {
        padding: 10px;
        gap: 0.5rem;
        border-radius: 6px;
    }
`

const ControlRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0px;

    label {
        font-size: 0.875rem;
        font-weight: 600;
        color: #444;
        margin-right: 16px;
    }

    select {
        padding: 4px 8px;
        border-radius: 4px;
        border: 1px solid #ccc;
        font-size: 0.875rem;
        min-width: 50px;
    }

    /* Mobile responsive control row */
    @media (max-width: 875px) {
        justify-content: flex-start;
        width: 100%;
        
        label {
            margin-right: 12px;
            min-width: 80px;
        }
        
        select {
            flex: 1;
        }
    }
    
    @media (max-width: 650px) {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.3rem;
        
        label {
            margin-right: 0;
            margin-bottom: 0.2rem;
            font-size: 0.8rem;
            min-width: auto;
        }
        
        select {
            width: 100%;
            padding: 6px 10px;
            font-size: 0.8rem;
        }
    }
`

const ControlButton = styled.button`
    padding: 6px 12px;
    border-radius: 4px;
    border: 1px solid #ccc;
    background: #f5f5f5;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;

    &:hover {
        background: #e5e5e5;
    }

    /* Mobile responsive control button */
    @media (max-width: 650px) {
        padding: 8px 12px;
        font-size: 0.8rem;
    }
`

const ImportanceSlider = styled.input`
    -webkit-appearance: none;
    width: 120px;
    height: 4px;
    border-radius: 2px;
    background: #ddd;
    outline: none;
    margin: 0;

    &::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #666;
        cursor: pointer;
        transition: background 0.2s;

        &:hover {
            background: #555;
        }
    }

    &::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #666;
        cursor: pointer;
        transition: background 0.2s;
        border: none;

        &:hover {
            background: #555;
        }
    }

    /* Mobile responsive slider */
    @media (max-width: 650px) {
        width: 100%;
        height: 6px;
        
        &::-webkit-slider-thumb {
            width: 18px;
            height: 18px;
        }
        
        &::-moz-range-thumb {
            width: 18px;
            height: 18px;
        }
    }
`

// Function to create intermediate points for polyline
const createPolylinePoints = (x1, y1, x2, y2, spacing = 60) => {
    const dx = x2 - x1
    const dy = y2 - y1
    const distance = Math.sqrt(dx * dx + dy * dy)
    const numPoints = Math.max(1, Math.floor(distance / spacing))
    const stepX = dx / numPoints
    const stepY = dy / numPoints

    const points = []
    for (let i = 0; i <= numPoints; i++) {
        points.push([x1 + stepX * i, y1 + stepY * i])
    }
    return points
}

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

const ProblemVisualizer = ({ 
    problemId, 
    modelId,
    solutionType,
    initialCausalLinksCount = 3, 
    nodeHighlightColor = '#333', 
    nodeHighlightWidth = 2.5, 
    initialImportanceFilter = 4,
    windowWidth = 0,
    visualizationType = 'circle',
    onVisualizationTypeChange,
}) => {
    const [problemData, setProblemData] = useState(null)
    const [chunksData, setChunksData] = useState([])
    const [counterfactualStepImportanceData, setCounterfactualStepImportanceData] = useState([])
    const [summaryData, setSummaryData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [selectedNode, setSelectedNode] = useState(null)
    const [hoveredNode, setHoveredNode] = useState(null)
    const [hoveredFromCentralGraph, setHoveredFromCentralGraph] = useState(false)
    const [resampledChunks, setResampledChunks] = useState({})
    const [isPanelOpen, setIsPanelOpen] = useState(false)
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' })
    const [normalizedWeights, setNormalizedWeights] = useState(new Map())
    const [scrollToNode, setScrollToNode] = useState(null)
    
    // Attribution graph specific state
    const [selectedPaths, setSelectedPaths] = useState([])
    const [maxDepth, setMaxDepth] = useState(2)
    const [lastAttributionNode, setLastAttributionNode] = useState(null)
    const [treeDirection, setTreeDirection] = useState('incoming') // 'incoming' or 'outgoing'
    
    const svgRef = useRef(null)
    const graphContainerRef = useRef(null)
    const detailPanelRef = useRef(null)
    const hoverTimerRef = useRef(null)
    const cotScrollTimerRef = useRef(null) // New timer for CoT scrolling
    const zoomRef = useRef(null)
    const layoutRef = useRef({ width: 0, height: 0, isPanelOpen: false })

    // Add state for controls
    const [localCausalLinksCount, setLocalCausalLinksCount] = useState(initialCausalLinksCount)
    const [localImportanceFilter, setLocalImportanceFilter] = useState(initialImportanceFilter)

    // Add state for supplementary data
    const [suppressionStepImportanceData, setSuppressionStepImportanceData] = useState(null)
    const [selectedMetric, setSelectedMetric] = useState('counterfactual')

    const hasSuppressionStepImportanceData = !!suppressionStepImportanceData
    const currentStepImportanceData = selectedMetric === 'counterfactual' ? counterfactualStepImportanceData : suppressionStepImportanceData

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                if (!problemId || !modelId || !solutionType) {
                    throw new Error('Problem ID, Model ID, or Solution Type is undefined')
                }

                // Fetch chunks data
                const chunksResponse = await import(`../../app/data/${modelId}/${solutionType}/${problemId}/chunks_labeled.json`)
                const chunksWithImportance = chunksResponse.default.map(chunk => ({
                    ...chunk,
                    importance: chunk.counterfactual_importance_kl // chunk.resampling_importance_kl
                }))
                setChunksData(chunksWithImportance)

                // Fetch step importance data
                const stepImportanceResponse = await import(
                    `../../app/data/${modelId}/${solutionType}/${problemId}/step_importance.json`
                )
                setCounterfactualStepImportanceData(stepImportanceResponse.default)

                // Fetch summary data
                const summaryResponse = await import(`../../app/data/${modelId}/${solutionType}/${problemId}/summary.json`)
                setSummaryData(summaryResponse.default)

                // Fetch problem data
                try {
                    const problemResponse = await import(`../../app/data/${modelId}/${solutionType}/${problemId}/problem.json`)
                    setProblemData(problemResponse.default)
                } catch (e) {
                    console.warn(`Problem data not found for ${problemId}`)
                }

                // Fetch supplementary data if exists
                try {
                    const suppressionResponse = await import(`../../app/data/${modelId}/${solutionType}/${problemId}/step_importance_supp.json`)
                    setSuppressionStepImportanceData(suppressionResponse.default)
                } catch (e) {
                    console.warn(`Attention suppression data not found for ${problemId}`)
                    setSuppressionStepImportanceData(null)
                }

                setLoading(false)
            } catch (error) {
                console.error('Error fetching data:', error)
                setLoading(false)
            }
        }

        fetchData()
    }, [problemId, modelId, solutionType])

    // Normalize connection weights
    useEffect(() => {
        if (currentStepImportanceData.length > 0) {
            const weightMap = new Map()
            
            // Collect all importance scores for global normalization
            const allImportanceScores = []
            currentStepImportanceData.forEach((step) => {
                const impacts = step.target_impacts || []
                impacts.forEach((impact) => {
                    allImportanceScores.push(Math.abs(impact.importance_score))
                })
            })
            
            // Find min and max for global 0-1 normalization
            const minImportance = Math.min(...allImportanceScores)
            const maxImportance = Math.max(...allImportanceScores)
            const importanceRange = maxImportance - minImportance || 1 // Avoid division by zero
            
            // Normalize each connection to 0-1 range
            currentStepImportanceData.forEach((step) => {
                const sourceIdx = step.source_chunk_idx
                const impacts = step.target_impacts || []
                
                impacts.forEach((impact) => {
                    const rawImportance = Math.abs(impact.importance_score)
                    const normalizedWeight = (rawImportance - minImportance) / importanceRange
                    const key = `${sourceIdx}-${impact.target_chunk_idx}`
                    weightMap.set(key, normalizedWeight)
                })
            })
            
            setNormalizedWeights(weightMap)
        }
    }, [currentStepImportanceData, problemId])

    // Auto-select the most important step when data loads by simulating a click
    useEffect(() => {
        if (chunksData.length > 0) {
            // Find the chunk with the highest importance score
            const mostImportantChunk = chunksData.reduce((max, chunk) => {
                const currentImportance = Math.abs(chunk.importance) || 0
                const maxImportance = Math.abs(max.importance) || 0
                return currentImportance > maxImportance ? chunk : max
            })

            if (mostImportantChunk) {
                // Simulate clicking on the most important step
                // This will trigger all the existing logic (scrolling, panel opening, etc.)
                const timer = setTimeout(() => {
                    handleStepClick(mostImportantChunk)
                    setScrollToNode(mostImportantChunk.chunk_idx)
                }, 100)
                return () => clearTimeout(timer)
            }
        }
    }, [chunksData, problemId, modelId, solutionType]) // Reset when data context changes

    // Clear selection when problem context changes
    useEffect(() => {
        setSelectedNode(null)
        setHoveredNode(null)
    }, [problemId, modelId, solutionType])

    // Add useEffect to handle connection highlighting for hovered or selected node
    useEffect(() => {
        if ((hoveredNode || selectedNode) && svgRef.current) {
            const svg = d3.select(svgRef.current)
            const links = svg.selectAll('.links path')
            
            // Use hovered node if available, otherwise fall back to selected node
            const nodeForConnections = hoveredNode || selectedNode
            
            // Get top-k incoming and outgoing connections
            const getTopOutgoingConnections = (nodeId, k) => {
                const stepData = currentStepImportanceData.find(step => step.source_chunk_idx === nodeId)
                if (!stepData?.target_impacts) return []
                
                return stepData.target_impacts
                    .sort((a, b) => Math.abs(b.importance_score) - Math.abs(a.importance_score))
                    .slice(0, k)
                    .map(impact => impact.target_chunk_idx)
            }

            const getTopIncomingConnections = (nodeId, k) => {
                const incomingConnections = []
                
                currentStepImportanceData.forEach(step => {
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
            
            const topOutgoing = getTopOutgoingConnections(nodeForConnections.id, localCausalLinksCount)
            const topIncoming = getTopIncomingConnections(nodeForConnections.id, localCausalLinksCount)
            
            // Apply connection highlighting
            links.attr('opacity', (d) => {
                if (d.type === 'sequential') {
                    // Show sequential connections if they involve the node
                    if (d.source.id === nodeForConnections.id || d.target.id === nodeForConnections.id) return 0.9
                    return 0.1
                }
                
                // For causal connections, check if it's in top-k incoming or outgoing
                const isOutgoing = d.source.id === nodeForConnections.id && topOutgoing.includes(d.target.id)
                const isIncoming = d.target.id === nodeForConnections.id && topIncoming.includes(d.source.id)
                
                if (isOutgoing) {
                    // Get the raw importance score for this specific connection
                    const stepData = currentStepImportanceData.find(step => step.source_chunk_idx === nodeForConnections.id)
                    const impact = stepData?.target_impacts?.find(impact => impact.target_chunk_idx === d.target.id)
                    const rawImportance = impact ? Math.abs(impact.importance_score) : 0
                    return Math.max(0.3, rawImportance * 4)
                } else if (isIncoming) {
                    // Get the raw importance score for this specific connection
                    const stepData = currentStepImportanceData.find(step => step.source_chunk_idx === d.source.id)
                    const impact = stepData?.target_impacts?.find(impact => impact.target_chunk_idx === nodeForConnections.id)
                    const rawImportance = impact ? Math.abs(impact.importance_score) : 0
                    return Math.max(0.3, rawImportance * 4)
                }
                return 0.1
            })
            .attr('stroke', (d) => (d.type === 'sequential' ? '#333' : '#999'))
            .attr('stroke-dasharray', (d) => (d.type === 'sequential' ? '0' : '3,3'))
            
            // Remove existing polylines for arrows
            svg.selectAll('.arrow-polylines').remove()
            
            // Add polylines with arrows for highlighted causal connections
            const highlightedCausal = links.data().filter(d => {
                if (d.type === 'sequential') return false
                const isOutgoing = d.source.id === nodeForConnections.id && topOutgoing.includes(d.target.id)
                const isIncoming = d.target.id === nodeForConnections.id && topIncoming.includes(d.source.id)
                return isOutgoing || isIncoming
            })
            
            svg.select('.links').selectAll('.arrow-polylines')
                .data(highlightedCausal)
                .enter()
                .append('polyline')
                .attr('class', 'arrow-polylines')
                .attr('points', (d) => {
                    const points = createPolylinePoints(d.source.fx, d.source.fy, d.target.fx, d.target.fy)
                    return points.map(p => `${p[0]},${p[1]}`).join(' ')
                })
                .attr('stroke', '#999')
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '3,3')
                .attr('fill', 'none')
                .attr('opacity', (d) => {
                    const isOutgoing = d.source.id === nodeForConnections.id && topOutgoing.includes(d.target.id)
                    const stepData = currentStepImportanceData.find(step => 
                        step.source_chunk_idx === (isOutgoing ? nodeForConnections.id : d.source.id))
                    const impact = stepData?.target_impacts?.find(impact => 
                        impact.target_chunk_idx === (isOutgoing ? d.target.id : nodeForConnections.id))
                    const rawImportance = impact ? Math.abs(impact.importance_score) : 0
                    return Math.max(0.3, rawImportance * 4)
                })
                .attr('marker-mid', (d) => {
                    const isOutgoing = d.source.id === nodeForConnections.id && topOutgoing.includes(d.target.id)
                    return isOutgoing ? 'url(#arrow-outgoing-mid)' : 'url(#arrow-incoming-mid)'
                })
                .attr('marker-end', 'url(#arrow-causal)')
                .style('cursor', 'pointer')
            
            // Handle node highlighting: always show selected node's black border
            svg.selectAll('.nodes g')
                .selectAll('circle')
                .attr('stroke', (d) => {
                    if (selectedNode && d.id === selectedNode.id) {
                        return nodeHighlightColor // Always keep selected node highlighted
                    }
                    return '#fff'
                })
                .attr('stroke-width', (d) => {
                    if (selectedNode && d.id === selectedNode.id) {
                        return nodeHighlightWidth // Always keep selected node border width
                    }
                    return 2
                })
        } else if (svgRef.current) {
            // Reset highlighting when no node is hovered or selected
            const svg = d3.select(svgRef.current)
            const links = svg.selectAll('.links path')
            
            links.attr('opacity', (d) => {
                if (d.type === 'sequential') return 0.8
                return Math.min(0.8, Math.max(0.2, d.weight * 2))
            })
            .attr('stroke', (d) => (d.type === 'sequential' ? '#333' : '#999'))
            .attr('stroke-dasharray', (d) => (d.type === 'sequential' ? '0' : '3,3'))
            
            // Remove arrow polylines
            svg.selectAll('.arrow-polylines').remove()
            
            svg.selectAll('.nodes g')
                .selectAll('circle')
                .attr('stroke', '#fff')
                .attr('stroke-width', 2)
        }
    }, [hoveredNode, selectedNode, normalizedWeights, localCausalLinksCount, currentStepImportanceData])

    // Add click-outside handler
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check if the click target is a node circle or any part of the SVG that represents a node
            const isNodeClick = event.target.closest('.nodes') || 
                               event.target.tagName === 'circle' ||
                               event.target.tagName === 'text'
            
            // Check if click is inside the detail panel using ref
            const detailPanel = detailPanelRef.current && detailPanelRef?.current?.contains(event.target)

            // Check if click is inside the controls container
            const controlsContainer = event.target.closest('.ControlsContainer') ||
                                    event.target.closest('select') ||
                                    event.target.closest('input') ||
                                    event.target.closest('button')
            
            // Only close if it's not a node click, not in the detail panel, and not in controls
            if (!isNodeClick && !detailPanel && !controlsContainer && selectedNode) {
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
        if (!loading && chunksData.length > 0 && currentStepImportanceData.length > 0 && visualizationType === 'circle') {
            renderGraph()
        }
    }, [loading, chunksData, currentStepImportanceData, localCausalLinksCount, normalizedWeights, selectedNode, localImportanceFilter, visualizationType])

    // Add a new useEffect to fetch resampled chunks
    useEffect(() => {
        const fetchResampledChunks = async () => {
            try {
                const resampledChunksResponse = await import(
                    `../../app/data/${modelId}/${solutionType}/${problemId}/chunks_resampled.json`
                )
                setResampledChunks(resampledChunksResponse.default)
            } catch (error) {
                console.error('Error fetching resampled chunks:', error)
            }
        }

        if (problemId && modelId && solutionType) {
            fetchResampledChunks()
        }
    }, [problemId, modelId, solutionType])

    // Update isPanelOpen when selectedNode changes
    useEffect(() => {
        setIsPanelOpen(selectedNode !== null)
    }, [selectedNode])

    // Cleanup hover timer on unmount
    useEffect(() => {
        return () => {
            if (hoverTimerRef.current) {
                clearTimeout(hoverTimerRef.current)
            }
            if (cotScrollTimerRef.current) {
                clearTimeout(cotScrollTimerRef.current)
            }
        }
    }, [])

    // Clear scrollToNode after scrolling is complete
    useEffect(() => {
        if (scrollToNode) {
            const timer = setTimeout(() => {
                setScrollToNode(null)
            }, 500) // Clear after scroll animation completes
            
            return () => clearTimeout(timer)
        }
    }, [scrollToNode])

    // Reset selectedNode and hoveredNode when problemId changes
    useEffect(() => {
        setSelectedNode(null)
        setHoveredNode(null)
    }, [problemId])

    // Update layout ref when panel state changes
    useEffect(() => {
        const wasPanelOpen = layoutRef.current.isPanelOpen
        layoutRef.current.isPanelOpen = selectedNode !== null
        if (graphContainerRef.current) {
            layoutRef.current.width = graphContainerRef.current.clientWidth
            layoutRef.current.height = graphContainerRef.current.clientHeight
        }
        
        // If panel state changed, trigger a re-render of the graph
        if (wasPanelOpen !== layoutRef.current.isPanelOpen && selectedNode === null) {
            renderGraph()
        }
    }, [selectedNode])

    // Update layout ref when container size changes
    useEffect(() => {
        const updateLayout = () => {
            if (graphContainerRef.current) {
                layoutRef.current.width = graphContainerRef.current.clientWidth
                layoutRef.current.height = graphContainerRef.current.clientHeight
            }
        }

        const resizeObserver = new ResizeObserver(updateLayout)
        if (graphContainerRef.current) {
            resizeObserver.observe(graphContainerRef.current)
        }

        return () => resizeObserver.disconnect()
    }, [])

    // Re-render graph when window size changes (debounced)
    useEffect(() => {
        if (windowWidth > 0 && !loading && chunksData.length > 0 && currentStepImportanceData.length > 0 && visualizationType === 'circle') {
            // Small delay to ensure layout has updated and prevent rapid re-renders
            const timer = setTimeout(() => {
                renderGraph()
            }, 200) // 200ms debounce for smoother resize
            return () => clearTimeout(timer)
        }
    }, [windowWidth])

    const renderGraph = () => {
        if (!svgRef.current || !graphContainerRef.current) return

        // Clear previous graph
        d3.select(svgRef.current).selectAll('*').remove()

        const containerWidth = graphContainerRef.current.clientWidth
        const containerHeight = graphContainerRef.current.clientHeight

        // Update layout ref
        layoutRef.current.width = containerWidth
        layoutRef.current.height = containerHeight

        // Create SVG
        const svg = d3.select(svgRef.current)
            .attr('width', containerWidth)
            .attr('height', containerHeight)

        // Add zoom functionality
        const zoom = d3
            .zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform)
            })
        svg.call(zoom)
        zoomRef.current = zoom

        // Create a group for the graph
        const g = svg.append('g')

        // Normalize importance scores for this problem to 0-1 range
        const rawImportances = chunksData.map(chunk => Math.abs(chunk.importance) || 0.01)
        const minImportance = Math.min(...rawImportances)
        const maxImportance = Math.max(...rawImportances)
        const importanceRange = maxImportance - minImportance || 1 // Avoid division by zero

        // Create nodes data with improved sizing
        const nodes = chunksData.map((chunk) => {
            const rawImportance = Math.abs(chunk.importance) || 0.01
            // Normalize importance to 0-1 range for this problem
            const normalizedImportance = (rawImportance - minImportance) / importanceRange
            
            // Mobile-specific node sizing
            let baseRadius, radiusMultiplier
            if (window.innerWidth <= 650) {
                // Mobile: smaller nodes
                baseRadius = 8
                radiusMultiplier = 2.5
            } else {
                // Desktop/tablet: original sizing
                baseRadius = 10
                radiusMultiplier = 3.5
            }
            
            return {
                id: chunk.chunk_idx,
                text: chunk.chunk,
                functionTag: chunk.function_tags[0],
                importance: normalizedImportance, // Use normalized importance
                rawImportance: rawImportance, // Keep raw for reference
                dependsOn: chunk.depends_on,
                // Dynamic radius based on normalized importance with mobile adjustments
                radius: Math.max(baseRadius, baseRadius + Math.log(1 + normalizedImportance * 20) * radiusMultiplier),
                // Color intensity based on normalized importance
                colorIntensity: Math.min(1, Math.max(0.6, normalizedImportance * 3))
            }
        })

        // Filter nodes based on importance threshold
        const filteredNodes = localImportanceFilter === 4 ? nodes : nodes
            .sort((a, b) => b.importance - a.importance)
            .slice(0, Math.max(1, Math.ceil(((localImportanceFilter + 1) / 5) * nodes.length)))

        // Sort nodes by ID to ensure proper ordering
        filteredNodes.sort((a, b) => a.id - b.id)

        // Create links data for sequential connections
        const sequentialLinks = []
        for (let i = 0; i < filteredNodes.length - 1; i++) {
            sequentialLinks.push({
                source: filteredNodes[i].id,
                target: filteredNodes[i + 1].id,
                type: 'sequential',
                weight: 1
            })
        }

        // Create links data for causal influences with normalized weights
        const causalLinks = []
        const existingLinks = new Set() // Track existing links to avoid duplicates
        
        // Add outgoing connections for all nodes
        currentStepImportanceData.forEach((step) => {
            const sourceIdx = step.source_chunk_idx
            // Only include links if source node is in filtered nodes
            if (!filteredNodes.find(n => n.id === sourceIdx)) return

            // Sort target impacts by importance score and take top-N based on user selection
            const topTargets = [...(step.target_impacts || [])]
                .sort((a, b) => Math.abs(b.importance_score) - Math.abs(a.importance_score))
                .slice(0, localCausalLinksCount)

            topTargets.forEach((target) => {
                // Only include links if target node is in filtered nodes
                if (!filteredNodes.find(n => n.id === target.target_chunk_idx)) return
                
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
        filteredNodes.forEach(node => {
            const topIncoming = []
            currentStepImportanceData.forEach(step => {
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
                .slice(0, localCausalLinksCount)
            
            topIncomingConnections.forEach(conn => {
                // Only include links if source node is in filtered nodes
                if (!filteredNodes.find(n => n.id === conn.sourceId)) return
                
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
        const nodeCount = filteredNodes.length
        const radius = Math.min(containerWidth, containerHeight) * (selectedNode ? 0.45 : 0.425)
        
        // Use a lower vertical offset when the right panel is open
        // Add mobile-specific adjustments for better positioning
        let verticalOffset
        if (window.innerWidth <= 650) {
            // Mobile: center the circle better for smaller screens
            verticalOffset = containerHeight * 0.35
        } else {
            // Desktop/tablet: use existing logic
            verticalOffset = containerHeight * (selectedNode ? 0.45 : 0.475)
        }

        filteredNodes.forEach((node, i) => {
            const angle = (i / nodeCount) * 2 * Math.PI - Math.PI / 2

            // Calculate center position
            const centerX = containerWidth / 2

            node.fx = centerX + radius * Math.cos(angle)
            node.fy = verticalOffset + radius * Math.sin(angle)
            node.angle = angle
        })

        // Create force simulation with minimal forces since we're using fixed positions
        const simulation = d3
            .forceSimulation(filteredNodes)
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

        // Forward arrow markers for outgoing connections (pointing right)
        defs.append('marker')
            .attr('id', 'arrow-outgoing-mid')
            .attr('viewBox', '0 -4 8 8')
            .attr('refX', 4)
            .attr('refY', 0)
            .attr('markerWidth', 5)
            .attr('markerHeight', 5)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-4L8,0L0,4')
            .attr('fill', '#999')

        // Backward arrow markers for incoming connections (pointing left)
        defs.append('marker')
            .attr('id', 'arrow-incoming-mid')
            .attr('viewBox', '0 -4 8 8')
            .attr('refX', 4)
            .attr('refY', 0)
            .attr('markerWidth', 5)
            .attr('markerHeight', 5)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-4L8,0L0,4')
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
            const stepData = currentStepImportanceData.find(step => step.source_chunk_idx === nodeId)
            if (!stepData?.target_impacts) return []
            
            return stepData.target_impacts
                .sort((a, b) => Math.abs(b.importance_score) - Math.abs(a.importance_score))
                .slice(0, k)
                .map(impact => impact.target_chunk_idx)
        }

        // Function to get top-k incoming connections for a node
        const getTopIncomingConnections = (nodeId, k) => {
            const incomingConnections = []
            
            currentStepImportanceData.forEach(step => {
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
            .data(filteredNodes)
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
        svg.selectAll('.nodes').data(filteredNodes)
        svg.selectAll('.links').data(links)

        // Update link positions
        simulation.on('tick', () => {
            link.attr('d', (d) => `M${d.source.fx},${d.source.fy}L${d.target.fx},${d.target.fy}`)
        })

        // Run simulation briefly to stabilize
        simulation.tick(10)
        
        // Apply selectedNode highlighting immediately if a node is selected
        if (selectedNode) {
            const topOutgoing = getTopOutgoingConnections(selectedNode.id, localCausalLinksCount)
            const topIncoming = getTopIncomingConnections(selectedNode.id, localCausalLinksCount)
            
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
                    const stepData = currentStepImportanceData.find(step => step.source_chunk_idx === selectedNode.id)
                    const impact = stepData?.target_impacts?.find(impact => impact.target_chunk_idx === d.target.id)
                    const rawImportance = impact ? Math.abs(impact.importance_score) : 0
                    return Math.max(0.3, rawImportance * 4)
                } else if (isIncoming) {
                    // Get the raw importance score for this specific connection
                    const stepData = currentStepImportanceData.find(step => step.source_chunk_idx === d.source.id)
                    const impact = stepData?.target_impacts?.find(impact => impact.target_chunk_idx === selectedNode.id)
                    const rawImportance = impact ? Math.abs(impact.importance_score) : 0
                    return Math.max(0.3, rawImportance * 4)
                }
                return 0.1
            })
            .attr('stroke', (d) => (d.type === 'sequential' ? '#333' : '#999'))
            .attr('stroke-dasharray', (d) => (d.type === 'sequential' ? '0' : '3,3'))
            
            // Remove existing polylines for arrows
            svg.selectAll('.arrow-polylines').remove()
            
            // Add polylines with arrows for highlighted causal connections
            const highlightedCausal = links.filter(d => {
                if (d.type === 'sequential') return false
                const isOutgoing = d.source.id === selectedNode.id && topOutgoing.includes(d.target.id)
                const isIncoming = d.target.id === selectedNode.id && topIncoming.includes(d.source.id)
                return isOutgoing || isIncoming
            })
            
            svg.select('.links').selectAll('.arrow-polylines')
                .data(highlightedCausal)
                .enter()
                .append('polyline')
                .attr('class', 'arrow-polylines')
                .attr('points', (d) => {
                    const points = createPolylinePoints(d.source.fx, d.source.fy, d.target.fx, d.target.fy)
                    return points.map(p => `${p[0]},${p[1]}`).join(' ')
                })
                .attr('stroke', '#999')
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '3,3')
                .attr('fill', 'none')
                .attr('opacity', (d) => {
                    const isOutgoing = d.source.id === selectedNode.id && topOutgoing.includes(d.target.id)
                    const stepData = currentStepImportanceData.find(step => 
                        step.source_chunk_idx === (isOutgoing ? selectedNode.id : d.source.id))
                    const impact = stepData?.target_impacts?.find(impact => 
                        impact.target_chunk_idx === (isOutgoing ? d.target.id : selectedNode.id))
                    const rawImportance = impact ? Math.abs(impact.importance_score) : 0
                    return Math.max(0.3, rawImportance * 4)
                })
                .attr('marker-mid', (d) => {
                    const isOutgoing = d.source.id === selectedNode.id && topOutgoing.includes(d.target.id)
                    return isOutgoing ? 'url(#arrow-outgoing-mid)' : 'url(#arrow-incoming-mid)'
                })
                .attr('marker-end', 'url(#arrow-causal)')
                .style('cursor', 'pointer')
            
            // Also highlight the selected node with circle
            svg.selectAll('.nodes g')
                .selectAll('circle')
                .attr('stroke', (d) => d.id === selectedNode.id ? nodeHighlightColor : '#fff')
                .attr('stroke-width', (d) => d.id === selectedNode.id ? nodeHighlightWidth : 2)
        }
    }

    const handleNodeHover = (event, node) => {
        // Clear any existing timers
        if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current)
        }
        if (cotScrollTimerRef.current) {
            clearTimeout(cotScrollTimerRef.current)
        }
        
        // Set up delayed CoT panel scrolling (350ms delay to reduce jitter)
        cotScrollTimerRef.current = setTimeout(() => {
            setHoveredNode(node)
            setHoveredFromCentralGraph(true)
        }, 350)
    }

    const handleNodeLeave = () => {
        // Clear any existing timers
        if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current)
        }
        if (cotScrollTimerRef.current) {
            clearTimeout(cotScrollTimerRef.current)
        }
        
        // Clear hovered node (this will trigger the useEffect to revert to selected node)
        setHoveredNode(null)
        setHoveredFromCentralGraph(false)
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

    // Helper function to get normalized importance score
    const getNormalizedImportanceScore = (sourceIdx, targetIdx) => {
        const key = `${sourceIdx}-${targetIdx}`
        return normalizedWeights.get(key) || 0
    }

    // Get causal effects for a node
    const getCausalEffects = (nodeId) => {
        const effects = []
        const stepData = currentStepImportanceData.find((step) => step.source_chunk_idx === nodeId)

        if (stepData && stepData.target_impacts) {
            stepData.target_impacts.forEach((impact) => {
                const targetNode = chunksData.find(
                    (chunk) => chunk.chunk_idx === impact.target_chunk_idx,
                )
                if (targetNode) {
                    effects.push({
                        id: targetNode.chunk_idx,
                        functionTag: targetNode.function_tags[0],
                        importance: getNormalizedImportanceScore(nodeId, impact.target_chunk_idx),
                        rawImportance: impact.importance_score, // Keep raw for reference
                        text: targetNode.chunk,
                    })
                }
            })
        }

        return effects.sort((a, b) => Math.abs(b.importance) - Math.abs(a.importance))
    }

    // Get what affects this node (causally affected by)
    const getCausallyAffectedBy = (nodeId, limit = localCausalLinksCount) => {
        const affectedBy = []
        
        currentStepImportanceData.forEach((step) => {
            const impact = step.target_impacts?.find(impact => impact.target_chunk_idx === nodeId)
            if (impact) {
                const sourceNode = chunksData.find(chunk => chunk.chunk_idx === step.source_chunk_idx)
                if (sourceNode) {
                    affectedBy.push({
                        id: step.source_chunk_idx,
                        functionTag: sourceNode.function_tags[0],
                        importance: getNormalizedImportanceScore(step.source_chunk_idx, nodeId),
                        rawImportance: impact.importance_score, // Keep raw for reference
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
            // Trigger scroll to the node in the left column
            setScrollToNode(nextNode.chunk_idx)
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
            // Trigger scroll to the node in the left column
            setScrollToNode(prevNode.chunk_idx)
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
        if (selectedNode && window.MathJax && window.MathJax.typesetPromise) {
            // Use a small timeout to ensure the DOM has updated
            const timer = setTimeout(() => {
                try {
                    // Target only the detail panel to avoid conflicts with other parts
                    const detailPanel = document.querySelector('[class*="DetailPanel"]')
                    if (detailPanel && detailPanel?.contains && document?.body?.contains(detailPanel)) {
                        window.MathJax.typesetPromise([detailPanel]).catch(err => {
                            console.warn('MathJax typesetting warning:', err)
                        })
                    }
                } catch (e) {
                    console.warn('MathJax typesetting error:', e)
                }
            }, 150)

            return () => clearTimeout(timer)
        }
    }, [selectedNode])

    // Add reset view function
    const resetGraphView = () => {
        if (visualizationType === 'circle') {
            if (svgRef.current && zoomRef.current) {
                const svg = d3.select(svgRef.current)
                svg.transition().duration(350).call(zoomRef.current.transform, d3.zoomIdentity)
            }
        } else if (visualizationType === 'attribution') {
            if (typeof window !== 'undefined' && window.resetAttributionGraphView) {
                window.resetAttributionGraphView()
            }
        }
    }

    // Add function to build attribution paths for selected node
    const buildAttributionPaths = (selectedNodeId, stepImportanceData, chunksData, maxDepth = 2, causalLinksCount = 3, direction = 'incoming') => {
        if (!selectedNodeId || !stepImportanceData.length) return []
        
        // Find the target chunk
        const targetChunk = chunksData.find(chunk => chunk.chunk_idx === selectedNodeId)
        if (!targetChunk) return []

        if (direction === 'incoming') {
            // Build paths by traversing backwards from selected node (showing what influences it)
            const buildIncomingPaths = (nodeId, currentDepth, visitedNodes = new Set()) => {
                if (currentDepth >= maxDepth || visitedNodes.has(nodeId)) {
                    return [[{ idx: nodeId, sources: [] }]]
                }

                visitedNodes.add(nodeId)
                const paths = []
                
                // Find all nodes that influence this node
                const influencingSteps = stepImportanceData.filter(step =>
                    step.target_impacts && step.target_impacts.some(impact => impact.target_chunk_idx === nodeId)
                )

                if (influencingSteps.length === 0) {
                    // Leaf node
                    return [[{ idx: nodeId, sources: [] }]]
                }

                // Get top influences
                const allInfluences = []
                influencingSteps.forEach(step => {
                    const impact = step.target_impacts.find(impact => impact.target_chunk_idx === nodeId)
                    if (impact) {
                        // Use normalized importance score instead of raw score
                        const normalizedScore = getNormalizedImportanceScore(step.source_chunk_idx, nodeId)
                        allInfluences.push({
                            idx: step.source_chunk_idx,
                            score: normalizedScore
                        })
                    }
                })

                // Sort by normalized importance and take top-N based on causalLinksCount
                const topInfluences = allInfluences
                    .sort((a, b) => b.score - a.score) // Sort by normalized score descending
                    .slice(0, causalLinksCount) // Use causalLinksCount parameter

                if (topInfluences.length === 0) {
                    return [[{ idx: nodeId, sources: [] }]]
                }

                // Recursively build paths for each influence
                topInfluences.forEach(influence => {
                    const subPaths = buildIncomingPaths(influence.idx, currentDepth + 1, new Set(visitedNodes))
                    subPaths.forEach(subPath => {
                        const nodePath = [{
                            idx: nodeId,
                            sources: topInfluences
                        }, ...subPath]
                        paths.push(nodePath)
                    })
                })

                visitedNodes.delete(nodeId)
                return paths.length > 0 ? paths : [[{ idx: nodeId, sources: topInfluences }]]
            }

            return buildIncomingPaths(selectedNodeId, 0)
        } else {
            // Build paths by traversing forwards from selected node (showing what it influences)
            const buildOutgoingPaths = (nodeId, currentDepth, visitedNodes = new Set()) => {
                if (currentDepth >= maxDepth || visitedNodes.has(nodeId)) {
                    return [[{ idx: nodeId, targets: [] }]]
                }

                visitedNodes.add(nodeId)
                const paths = []
                
                // Find the step data for this node
                const stepData = stepImportanceData.find(step => step.source_chunk_idx === nodeId)
                
                if (!stepData || !stepData.target_impacts || stepData.target_impacts.length === 0) {
                    // Leaf node
                    return [[{ idx: nodeId, targets: [] }]]
                }

                // Get top targets this node influences
                const allTargets = stepData.target_impacts.map(impact => ({
                    idx: impact.target_chunk_idx,
                    score: getNormalizedImportanceScore(nodeId, impact.target_chunk_idx)
                }))

                // Sort by normalized importance and take top-N based on causalLinksCount
                const topTargets = allTargets
                    .sort((a, b) => b.score - a.score) // Sort by normalized score descending
                    .slice(0, causalLinksCount) // Use causalLinksCount parameter

                if (topTargets.length === 0) {
                    return [[{ idx: nodeId, targets: [] }]]
                }

                // Recursively build paths for each target
                topTargets.forEach(target => {
                    const subPaths = buildOutgoingPaths(target.idx, currentDepth + 1, new Set(visitedNodes))
                    subPaths.forEach(subPath => {
                        const nodePath = [{
                            idx: nodeId,
                            targets: topTargets
                        }, ...subPath]
                        paths.push(nodePath)
                    })
                })

                visitedNodes.delete(nodeId)
                return paths.length > 0 ? paths : [[{ idx: nodeId, targets: topTargets }]]
            }

            const result = buildOutgoingPaths(selectedNodeId, 0)
            return result
        }
    }

    // Update attribution paths when selected node changes
    useEffect(() => {
        if (visualizationType === 'attribution') {
            // Always try to build paths when in attribution view
            let nodeIdToUse = selectedNode?.id || lastAttributionNode
            
            // If no node is available, auto-select the most important one
            if (!nodeIdToUse && chunksData.length > 0) {
                const mostImportantChunk = chunksData.reduce((max, chunk) => {
                    const currentImportance = Math.abs(chunk.importance) || 0
                    const maxImportance = Math.abs(max.importance) || 0
                    return currentImportance > maxImportance ? chunk : max
                })
                nodeIdToUse = mostImportantChunk.chunk_idx
            }
            
            if (nodeIdToUse && currentStepImportanceData.length > 0 && chunksData.length > 0) {
                const paths = buildAttributionPaths(nodeIdToUse, currentStepImportanceData, chunksData, maxDepth, localCausalLinksCount, treeDirection)
                if (paths && paths.length > 0) {
                    setSelectedPaths(paths)
                    // Only update lastAttributionNode if we have a valid selectedNode
                    if (selectedNode?.id) {
                        setLastAttributionNode(selectedNode.id)
                    } else if (!lastAttributionNode) {
                        // Set lastAttributionNode to the auto-selected node
                        setLastAttributionNode(nodeIdToUse)
                    }
                } else {
                    setSelectedPaths([])
                }
            } else {
                setSelectedPaths([])
            }
        } else if (visualizationType === 'circle') {
            // Only clear paths when switching to circle view
            setSelectedPaths([])
        }
        // Note: Don't clear lastAttributionNode when switching to circle view - keep it for when we switch back
    }, [selectedNode, currentStepImportanceData, chunksData, maxDepth, visualizationType, normalizedWeights, localCausalLinksCount, treeDirection])

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
                            <h3 style={{ marginBottom: '0.75rem' }}>
                                {`${problemData?.nickname[0].toUpperCase() + problemData?.nickname.slice(1).toLowerCase()}` || `Problem ${summaryData.problem_idx}`}
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
                            {hasSuppressionStepImportanceData && (
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
                                        <strong>Sentence-to-sentence metric:</strong>
                                    </p>
                                    <select
                                        value={selectedMetric}
                                        onChange={(e) => setSelectedMetric(e.target.value)}
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            border: '1px solid #ccc',
                                            fontSize: '0.875rem',
                                        }}
                                    >
                                        <option value="counterfactual">Counterfactual</option>
                                        <option value="attention suppression">Attention suppression</option>
                                    </select>
                                </div>
                            )}
                        </ProblemBox>
                    )}

                    <Legend>
                        <h3 style={{ marginBottom: '0.25rem' }}>Visualization legend</h3>
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
                                    <defs>
                                        <marker id='legend-arrow-outgoing' viewBox='0 -4 8 8' refX='4' refY='0' markerWidth='4' markerHeight='4' orient='auto'>
                                            <path d='M0,-4L8,0L0,4' fill='#999'/>
                                        </marker>
                                    </defs>
                                    <polyline
                                        points='0,5 15,5 30,5'
                                        stroke='#999'
                                        strokeWidth='2'
                                        strokeDasharray='3,3'
                                        fill='none'
                                        markerMid='url(#legend-arrow-outgoing)'
                                    />
                                </svg>
                                <span>Outgoing connections (on hover)</span>
                            </LegendItem>
                            <LegendItem>
                                <svg width='30' height='10'>
                                    <defs>
                                        <marker id='legend-arrow-incoming' viewBox='0 -4 8 8' refX='4' refY='0' markerWidth='4' markerHeight='4' orient='auto'>
                                            <path d='M8,-4L0,0L8,4' fill='#999'/>
                                        </marker>
                                    </defs>
                                    <polyline
                                        points='0,5 15,5 30,5'
                                        stroke='#999'
                                        strokeWidth='2'
                                        strokeDasharray='3,3'
                                        fill='none'
                                        markerMid='url(#legend-arrow-incoming)'
                                    />
                                </svg>
                                <span>Incoming connections (on hover)</span>
                            </LegendItem>
                            <LegendItem dontShowOnMobile={true}>
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
                            stepImportanceData={currentStepImportanceData}
                            selectedNode={selectedNode}
                            hoveredNode={hoveredNode}
                            onStepHover={handleStepHover}
                            onStepClick={handleStepClick}
                            onStepLeave={handleStepLeave}
                            causalLinksCount={localCausalLinksCount}
                            hoveredFromCentralGraph={hoveredFromCentralGraph}
                            scrollToNode={scrollToNode}
                        />

                        <GraphContainer ref={graphContainerRef}>
                            <GraphControls>
                                <ControlRow>
                                    <label>View:</label>
                                    <VisualizationToggle>
                                        <ToggleOption
                                            active={visualizationType === 'circle'}
                                            onClick={() => {
                                                if (onVisualizationTypeChange) {
                                                    onVisualizationTypeChange('circle')
                                                }
                                            }}
                                        >
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                                                {/* Dots positioned around the circle edge */}
                                                <circle cx="12" cy="2" r="1.5" fill="currentColor"/>
                                                <circle cx="20.2" cy="7.8" r="1.5" fill="currentColor"/>
                                                <circle cx="20.2" cy="16.2" r="1.5" fill="currentColor"/>
                                                <circle cx="12" cy="22" r="1.5" fill="currentColor"/>
                                                <circle cx="3.8" cy="16.2" r="1.5" fill="currentColor"/>
                                                <circle cx="3.8" cy="7.8" r="1.5" fill="currentColor"/>
                                            </svg>
                                            Circle
                                        </ToggleOption>
                                        <ToggleOption
                                            active={visualizationType === 'attribution'}
                                            onClick={() => {
                                                if (onVisualizationTypeChange) {
                                                    onVisualizationTypeChange('attribution')
                                                }
                                            }}
                                        >
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                {/* Top level nodes */}
                                                <rect x="2" y="3" width="4" height="4" rx="1" fill="currentColor"/>
                                                <rect x="10" y="3" width="4" height="4" rx="1" fill="currentColor"/>
                                                <rect x="18" y="3" width="4" height="4" rx="1" fill="currentColor"/>
                                                {/* Bottom target node */}
                                                <rect x="10" y="17" width="4" height="4" rx="1" fill="currentColor"/>
                                                {/* Simple connecting lines */}
                                                <line x1="4" y1="7" x2="12" y2="17" stroke="currentColor" strokeWidth="1.5"/>
                                                <line x1="12" y1="7" x2="12" y2="17" stroke="currentColor" strokeWidth="1.5"/>
                                                <line x1="20" y1="7" x2="12" y2="17" stroke="currentColor" strokeWidth="1.5"/>
                                            </svg>
                                            Tree
                                        </ToggleOption>
                                    </VisualizationToggle>
                                </ControlRow>
                                
                                {visualizationType === 'circle' ? (
                                    <>
                                        <ControlRow>
                                            <label>Causal links:</label>
                                            <select
                                                value={localCausalLinksCount}
                                                onChange={(e) => setLocalCausalLinksCount(Number(e.target.value))}
                                            >
                                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                                    <option key={num} value={num}>
                                                        {num}
                                                    </option>
                                                ))}
                                            </select>
                                        </ControlRow>
                                        <ControlRow>
                                            <label>Node filter:</label>
                                            <ImportanceSlider
                                                type="range"
                                                min="0"
                                                max="4"
                                                value={localImportanceFilter}
                                                onChange={e => setLocalImportanceFilter(Number(e.target.value))}
                                            />
                                            <span style={{ fontSize: '0.875rem', color: '#666', marginLeft: '0.5rem', minWidth: '48px' }}>
                                                {localImportanceFilter === 4 ? 'All nodes' : `Top ${Math.ceil(((localImportanceFilter + 1) / 5) * 100)}%`}
                                            </span>
                                        </ControlRow>
                                    </>
                                ) : (
                                    <>
                                        <ControlRow>
                                            <label>Direction:</label>
                                            <select
                                                value={treeDirection}
                                                onChange={(e) => setTreeDirection(e.target.value)}
                                            >
                                                <option value="incoming">Incoming</option>
                                                <option value="outgoing">Outgoing</option>
                                            </select>
                                        </ControlRow>
                                        <ControlRow>
                                            <label>Causal links:</label>
                                            <select
                                                value={localCausalLinksCount}
                                                onChange={(e) => setLocalCausalLinksCount(Number(e.target.value))}
                                            >
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                                    <option key={num} value={num}>
                                                        {num}
                                                    </option>
                                                ))}
                                            </select>
                                        </ControlRow>
                                        <ControlRow>
                                            <label>Max depth:</label>
                                            <select
                                                value={maxDepth}
                                                onChange={(e) => setMaxDepth(Number(e.target.value))}
                                            >
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((num) => (
                                                    <option key={num} value={num}>
                                                        {num}
                                                    </option>
                                                ))}
                                            </select>
                                        </ControlRow>
                                    </>
                                )}
                                
                                <ControlRow>
                                    <ControlButton onClick={resetGraphView}>
                                        Reset view
                                    </ControlButton>
                                </ControlRow>
                            </GraphControls>
                            
                            {visualizationType === 'circle' ? (
                                <svg ref={svgRef} width='100%' height='100%'></svg>
                            ) : (
                                <AttributionGraph
                                    selectedIdx={selectedNode?.id || lastAttributionNode}
                                    chunksData={chunksData}
                                    selectedPaths={selectedPaths}
                                    treeDirection={treeDirection}
                                    causalLinksCount={localCausalLinksCount}
                                    maxDepth={maxDepth}
                                    onNodeHover={handleNodeHover}
                                    onNodeLeave={handleNodeLeave}
                                    onNodeClick={handleNodeClick}
                                />
                            )}
                        </GraphContainer>

                        <DetailPanel visible={selectedNode !== null ? 'true' : undefined} ref={detailPanelRef}>
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
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                navigateToNode('prev')
                                            }}
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
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                navigateToNode('next')
                                            }}
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
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.75rem' }}>
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
                                                Importance: {selectedNode.importance.toFixed(3)}
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
                                            title={`← Incoming connections (top-${localCausalLinksCount})`}
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
                                                            onClick={(e) => {
                                                                e.stopPropagation()
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
                                                                    // Trigger scroll to the node in the left column
                                                                    setScrollToNode(targetNode.chunk_idx)
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
                                                                    Influence: {affector.importance.toFixed(3)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            }
                                        />
                                    )}

                                    {/* Causal effects section - collapsible, open by default */}
                                    {getCausalEffects(selectedNode.id).slice(0, localCausalLinksCount).length > 0 && (
                                        <CollapsibleSection 
                                            title={`→ Outgoing connections (top-${localCausalLinksCount})`}
                                            defaultOpen={true}
                                            content={
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    {getCausalEffects(selectedNode.id)
                                                        .slice(0, localCausalLinksCount)
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
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
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
                                                                        // Trigger scroll to the node in the left column
                                                                        setScrollToNode(targetNode.chunk_idx)
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
                                                                        Influence: {effect.importance.toFixed(3)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            }
                                        />
                                    )}

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setSelectedNode(null)
                                        }}
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