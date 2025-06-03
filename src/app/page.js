'use client'
import { useState, useEffect, useRef } from 'react'
import Layout from '@/components/shared/layout'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import * as d3 from 'd3'
import styled from 'styled-components'
import { MathJax } from 'better-react-mathjax'

const VisualizerContainer = styled.div`
    padding: 2rem 0rem 2rem 0rem;
    max-width: 1400px;
    margin: 0 auto;
`

const Title = styled.h1`
    font-size: 2rem;
    margin-bottom: 1.5rem;
    color: #333;
`

const VisualizerWrapper = styled.div`
    display: flex;
    flex-direction: row;
    gap: 1.5rem;
    height: 80vh;
`

const GraphContainer = styled.div`
    flex: 3;
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
    background: #f9f9f9;
    position: relative;
`

const ProblemBox = styled.div`
    padding: 1rem;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    margin-bottom: 1rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
`

const DetailPanel = styled.div`
    flex: 2;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 1rem;
    background: white;
    overflow-y: auto;
    max-width: 450px;
    display: ${(props) => (props.visible ? 'block' : 'none')};
`

const LoadingIndicator = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    font-size: 1.2rem;
    color: #666;
`

const Legend = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 1rem;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
`

const LegendRow = styled.div`
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
`

const LegendItem = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
`

const ControlsContainer = styled.div`
    display: flex;
    flex-direction: row;
    gap: 2rem;
    margin-bottom: 1rem;
    align-items: center;
`

const SelectContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
`

// Define color mapping for function tags
const functionTagColors = {
    problem_setup: '#4285F4', // Blue
    plan_generation: '#EA4335', // Red
    fact_retrieval: '#FBBC05', // Yellow
    active_computation: '#34A853', // Green
    uncertainty_management: '#9C27B0', // Purple
    self_checking: '#FF9800', // Orange
    result_consolidation: '#00BCD4', // Cyan
    final_answer_emission: '#795548', // Brown
}

// Format function tag for display
const formatFunctionTag = (tag) => {
    return tag
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

const ProblemVisualizer = ({ problemId, causalLinksCount }) => {
    const [problemData, setProblemData] = useState(null)
    const [chunksData, setChunksData] = useState([])
    const [stepImportanceData, setStepImportanceData] = useState([])
    const [summaryData, setSummaryData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [selectedNode, setSelectedNode] = useState(null)
    const [resampledChunks, setResampledChunks] = useState({})
    const [isPanelOpen, setIsPanelOpen] = useState(false)
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
                const chunksResponse = await import(`./data/${problemId}/chunks_labeled.json`)
                setChunksData(chunksResponse.default)

                // Fetch step importance data
                const stepImportanceResponse = await import(
                    `./data/${problemId}/step_importance.json`
                )
                setStepImportanceData(stepImportanceResponse.default)

                // Fetch summary data
                const summaryResponse = await import(`./data/${problemId}/summary.json`)
                setSummaryData(summaryResponse.default)

                // Fetch problem data
                try {
                    const problemResponse = await import(`./data/${problemId}/problem.json`)
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

    // Create a separate useEffect for initial graph rendering
    useEffect(() => {
        if (!loading && chunksData.length > 0 && stepImportanceData.length > 0) {
            renderGraph()
        }
    }, [loading, chunksData, stepImportanceData, causalLinksCount]) // Add causalLinksCount as dependency

    // Add a new useEffect just for updating node opacity
    useEffect(() => {
        if (!loading && chunksData.length > 0 && selectedNode) {
            // Only update the opacity of nodes without re-creating the entire graph
            d3.select(svgRef.current)
                .selectAll('.nodes circle')
                .attr('opacity', (d) => (d.id === selectedNode.id ? 0.5 : 1))
        }
    }, [selectedNode])

    // Update isPanelOpen when selectedNode changes
    useEffect(() => {
        setIsPanelOpen(selectedNode !== null)
    }, [selectedNode])

    // Modify the transition effect to only run when isPanelOpen changes
    useEffect(() => {
        if (!svgRef.current || !graphContainerRef.current) return

        const svg = d3.select(svgRef.current)
        const g = svg.select('g') // Get the main group element

        if (g.empty()) return // Skip if no group element exists yet

        if (isPanelOpen) {
            // Panel is open, shift graph to the left
            g.transition().duration(300).attr('transform', `translate(-200, 0) scale(1)`)
        } else {
            // Panel is closed, reset position
            g.transition().duration(300).attr('transform', `translate(0, 0) scale(1)`)
        }
    }, [isPanelOpen]) // Only run when panel visibility changes

    // Add a new useEffect to fetch resampled chunks
    useEffect(() => {
        const fetchResampledChunks = async () => {
            try {
                const resampledChunksResponse = await import(
                    `./data/${problemId}/chunks_resampled.json`
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

        // If panel is already open, apply initial shift
        if (isPanelOpen) {
            g.attr('transform', 'translate(-150, 0) scale(1)')
        }

        // Create nodes data
        const nodes = chunksData.map((chunk) => ({
            id: chunk.chunk_idx,
            text: chunk.chunk,
            functionTag: chunk.function_tags[0],
            importance: Math.abs(chunk.importance) || 0.01, // Use absolute value, with minimum size
            dependsOn: chunk.depends_on,
        }))

        // Sort nodes by ID to ensure proper ordering
        nodes.sort((a, b) => a.id - b.id)

        // Create links data for sequential connections
        const sequentialLinks = []
        for (let i = 0; i < nodes.length - 1; i++) {
            sequentialLinks.push({
                source: nodes[i].id,
                target: nodes[i + 1].id,
                type: 'sequential',
            })
        }

        // Create links data for causal influences
        const causalLinks = []
        stepImportanceData.forEach((step) => {
            const sourceIdx = step.source_chunk_idx

            // Sort target impacts by importance score and take top-N based on user selection
            const topTargets = [...step.target_impacts]
                .sort((a, b) => Math.abs(b.importance_score) - Math.abs(a.importance_score))
                .slice(0, causalLinksCount) // Use the dynamic causalLinksCount

            topTargets.forEach((target) => {
                causalLinks.push({
                    source: sourceIdx,
                    target: target.target_chunk_idx,
                    weight: Math.abs(target.importance_score),
                    type: 'causal',
                })
            })
        })

        // Combine all links
        const links = [...sequentialLinks, ...causalLinks]

        // Position nodes in a circle
        const nodeCount = nodes.length
        const radius = Math.min(width, height) * 0.35 // Adjust radius to fit within container

        // Position nodes in a circle starting from the top (0 degrees)
        nodes.forEach((node, i) => {
            // Calculate angle based on position in sequence (0 at top, going clockwise)
            const angle = (i / nodeCount) * 2 * Math.PI - Math.PI / 2 // Start at top (negative PI/2)

            // Set fixed positions in a circle
            node.fx = width / 2 + radius * Math.cos(angle)
            node.fy = height / 2 + radius * Math.sin(angle)

            // Store the angle for reference
            node.angle = angle
        })

        // Create force simulation with minimal forces since we're using fixed positions
        const simulation = d3
            .forceSimulation(nodes)
            .force(
                'link',
                d3.forceLink(links).id((d) => d.id),
            )
            .force('charge', d3.forceManyBody().strength(-5)) // Very weak repulsion
            .alphaDecay(0.1) // Quick stabilization

        // Add arrow markers for sequential links
        svg.append('defs')
            .append('marker')
            .attr('id', 'arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 5)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#000')

        // Create links
        const link = g
            .append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(links)
            .enter()
            .append('line')
            .attr('stroke-width', (d) => (d.type === 'sequential' ? 2 : Math.max(1, d.weight * 5)))
            .attr('stroke', (d) => (d.type === 'sequential' ? '#000' : '#999'))
            .attr('stroke-dasharray', (d) => (d.type === 'sequential' ? '0' : '5,5'))
            .attr('opacity', (d) =>
                d.type === 'sequential' ? 0.8 : Math.min(0.7, Math.max(0.1, d.weight)),
            )
            .attr('marker-mid', (d) => (d.type === 'sequential' ? 'url(#arrow)' : ''))

        // Create nodes
        const node = g
            .append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(nodes)
            .enter()
            .append('g')
            .attr('transform', (d) => `translate(${d.fx},${d.fy})`) // Use fixed positions

        // Add circles to nodes
        node.append('circle')
            .attr('r', (d) => 10 + d.importance * 20)
            .attr('fill', (d) => functionTagColors[d.functionTag] || '#999')
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5)
            .attr('opacity', (d) => (selectedNode && d.id === selectedNode.id ? 0.5 : 1))
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => {
                // Set selected node on hover
                setSelectedNode(d)
            })
            .on('click', (event, d) => {
                // Keep the same behavior for click (useful for mobile)
                setSelectedNode(d)
            })

        // Add labels to nodes
        node.append('text')
            .text((d) => d.id)
            .attr('font-size', '12px')
            .attr('text-anchor', 'middle')
            .attr('dy', '.35em')
            .attr('fill', '#fff')
            .style('pointer-events', 'none')

        // Highlight the first node
        const firstNodeId = Math.min(...nodes.map((n) => n.id))
        node.filter((d) => d.id === firstNodeId)
            .append('circle')
            .attr('r', 15)
            .attr('fill', 'none')
            .attr('stroke', '#ff0000')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5')
            .style('pointer-events', 'none')

        // Highlight the last node
        const lastNodeId = Math.max(...nodes.map((n) => n.id))
        node.filter((d) => d.id === lastNodeId)
            .append('circle')
            .attr('r', 15)
            .attr('fill', 'none')
            .attr('stroke', '#00ff00')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5')
            .style('pointer-events', 'none')

        // Update link positions
        simulation.on('tick', () => {
            link.attr('x1', (d) => d.source.fx)
                .attr('y1', (d) => d.source.fy)
                .attr('x2', (d) => d.target.fx)
                .attr('y2', (d) => d.target.fy)
        })

        // Run simulation briefly to stabilize
        simulation.tick(10)
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
                    })
                }
            })
        }

        // Sort by importance (absolute value)
        return effects.sort((a, b) => Math.abs(b.importance) - Math.abs(a.importance))
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

    const processText = (text) => {
        // Replace double newlines with spaces
        let modifiedText = text.replaceAll('\n\n', ' ')
        // Escape dollar signs that might be causing issues
        return modifiedText
    }

    // Add a new function to process math expressions
    const processMathText = (text) => {
        if (!text) return ''

        // First, handle the basic text processing
        let processedText = processText(text)

        // Check if the text contains LaTeX delimiters
        if (
            processedText.includes('$') ||
            processedText.includes('\\(') ||
            processedText.includes('\\[')
        ) {
            // Return the text to be rendered with MathJax
            return (
                <MathJax key={`math-${processedText.slice(0, 20)}`} hideUntilTypeset='first'>
                    {processedText}
                </MathJax>
            )
        }

        // If no LaTeX delimiters, return as regular text
        return processedText
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
                        <h3>Visualization Legend</h3>
                        <LegendRow>
                            <LegendItem>
                                <svg width='30' height='10'>
                                    <line
                                        x1='0'
                                        y1='5'
                                        x2='30'
                                        y2='5'
                                        stroke='black'
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
                                        strokeDasharray='5,5'
                                    />
                                </svg>
                                <span>Causal influence (top-{causalLinksCount})</span>
                            </LegendItem>
                            <LegendItem>
                                <svg width='60' height='20'>
                                    <circle cx='5' cy='10' r='5' fill='#4285F4' />
                                    <circle cx='20' cy='10' r='7' fill='#4285F4' />
                                    <circle cx='40' cy='10' r='9' fill='#4285F4' />
                                </svg>
                                <span style={{ marginLeft: '-8px', display: 'flex' }}>
                                    Node size = importance to final answer
                                </span>
                            </LegendItem>
                            <LegendItem>
                                <div
                                    style={{
                                        width: '15px',
                                        height: '15px',
                                        borderRadius: '50%',
                                        border: '2px dashed #ff0000',
                                    }}
                                ></div>
                                <span>First step</span>
                            </LegendItem>
                            <LegendItem>
                                <div
                                    style={{
                                        width: '15px',
                                        height: '15px',
                                        borderRadius: '50%',
                                        border: '2px dashed #00ff00',
                                    }}
                                ></div>
                                <span>Final step</span>
                            </LegendItem>
                        </LegendRow>
                        <LegendRow>
                            <div style={{ marginTop: '0.5rem' }}>
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
                                            <span>{formatFunctionTag(tag)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </LegendRow>
                    </Legend>

                    <VisualizerWrapper>
                        <GraphContainer ref={graphContainerRef}>
                            <svg ref={svgRef} width='100%' height='100%'></svg>
                        </GraphContainer>

                        <DetailPanel visible={selectedNode !== null ? 'true' : undefined}>
                            {selectedNode && (
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.5rem',
                                    }}
                                >
                                    <h3>Step {selectedNode.id}</h3>
                                    <p>
                                        <strong>Function:</strong>{' '}
                                        {formatFunctionTag(selectedNode.functionTag)}
                                    </p>
                                    <p>
                                        <strong>Importance:</strong>{' '}
                                        {selectedNode.importance.toFixed(4)}
                                    </p>
                                    <div
                                        style={{
                                            flexDirection: 'row',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '0.5rem',
                                        }}
                                    >
                                        <h4>Text:</h4>
                                        <p>{processMathText(selectedNode.text)}</p>
                                    </div>

                                    {/* Add resampled sentences section */}
                                    <div style={{ marginTop: '1rem' }}>
                                        <h4>Resampled steps:</h4>
                                        <div style={{ marginLeft: '0.5rem', marginTop: '0.5rem' }}>
                                            {getTopResampledSentences(selectedNode.id).length >
                                            0 ? (
                                                <ul style={{ paddingLeft: '1rem' }}>
                                                    {getTopResampledSentences(selectedNode.id).map(
                                                        (resample, index) => (
                                                            <li
                                                                key={index}
                                                                style={{ marginBottom: '0.5rem' }}
                                                            >
                                                                {processMathText(resample)}
                                                            </li>
                                                        ),
                                                    )}
                                                </ul>
                                            ) : (
                                                <p>
                                                    This step seems overdetermined... No different
                                                    resamples found in dataset.
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Causal effects section */}
                                    <div style={{ marginTop: '1rem' }}>
                                        <h4>Causally affects (top-{causalLinksCount}):</h4>
                                        <div style={{ marginLeft: '0.5rem', marginTop: '0.5rem' }}>
                                            {getCausalEffects(selectedNode.id).slice(
                                                0,
                                                causalLinksCount,
                                            ).length > 0 ? (
                                                <ul style={{ paddingLeft: '1rem' }}>
                                                    {getCausalEffects(selectedNode.id)
                                                        .slice(0, causalLinksCount)
                                                        .map((effect) => (
                                                            <li
                                                                key={effect.id}
                                                                style={{ marginBottom: '0.5rem' }}
                                                            >
                                                                <button
                                                                    onClick={() => {
                                                                        const targetNode =
                                                                            chunksData.find(
                                                                                (chunk) =>
                                                                                    chunk.chunk_idx ===
                                                                                    effect.id,
                                                                            )
                                                                        if (targetNode) {
                                                                            setSelectedNode({
                                                                                id: targetNode.chunk_idx,
                                                                                text: targetNode.chunk,
                                                                                functionTag:
                                                                                    targetNode
                                                                                        .function_tags[0],
                                                                                importance:
                                                                                    Math.abs(
                                                                                        targetNode.importance,
                                                                                    ) || 0.01,
                                                                                dependsOn:
                                                                                    targetNode.depends_on,
                                                                            })
                                                                        }
                                                                    }}
                                                                    style={{
                                                                        background: 'none',
                                                                        border: 'none',
                                                                        padding: '0',
                                                                        color: '#0066cc',
                                                                        textDecoration: 'underline',
                                                                        cursor: 'pointer',
                                                                        textAlign: 'left',
                                                                        fontWeight: 'normal',
                                                                        fontSize: '1rem',
                                                                    }}
                                                                >
                                                                    Step {effect.id} (
                                                                    {formatFunctionTag(
                                                                        effect.functionTag,
                                                                    )}
                                                                    )
                                                                </button>
                                                                <span
                                                                    style={{
                                                                        marginLeft: '0.5rem',
                                                                        color:
                                                                            effect.importance < 0
                                                                                ? '#d32f2f'
                                                                                : '#388e3c',
                                                                    }}
                                                                >
                                                                    {effect.importance.toFixed(4)}
                                                                </span>
                                                            </li>
                                                        ))}
                                                </ul>
                                            ) : (
                                                <p>No causal effects found</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Navigation buttons */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginTop: '1rem',
                                        }}
                                    >
                                        {selectedNode.id >
                                            Math.min(
                                                ...chunksData.map((chunk) => chunk.chunk_idx),
                                            ) && (
                                            <button
                                                onClick={() => navigateToNode('prev')}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    background: '#f0f0f0',
                                                    border: '1px solid #ccc',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                ← Previous
                                            </button>
                                        )}
                                        <div style={{ flex: 1 }}></div>
                                        {selectedNode.id <
                                            Math.max(
                                                ...chunksData.map((chunk) => chunk.chunk_idx),
                                            ) && (
                                            <button
                                                onClick={() => navigateToNode('next')}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    background: '#f0f0f0',
                                                    border: '1px solid #ccc',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                Next →
                                            </button>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => setSelectedNode(null)}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            background: '#f0f0f0',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                            marginTop: '0.5rem',
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

export default function HomeScreen() {
    const [problems, setProblems] = useState([])
    const [selectedProblem, setSelectedProblem] = useState('problem_2238')
    const [causalLinksCount, setCausalLinksCount] = useState(3)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Get list of available problems
        const fetchProblems = async () => {
            try {
                // This would ideally be an API call, but for now we'll hardcode the problems we know exist
                const availableProblems = [
                    'problem_330',
                    'problem_1591',
                    'problem_2189',
                    'problem_2236',
                    'problem_2238',
                    'problem_3448',
                    'problem_4164',
                    'problem_4682',
                    'problem_6596',
                    'problem_6998',
                ]
                setProblems(availableProblems)
                setLoading(false)
            } catch (error) {
                console.error('Error fetching problems:', error)
                setLoading(false)
            }
        }

        fetchProblems()
    }, [])

    const handleProblemChange = (e) => {
        setSelectedProblem(e.target.value)
    }

    return (
        <Layout>
            <Navbar />
            <VisualizerContainer>
                <Title>Principled attribution in multi-step reasoning for thinking models</Title>

                {loading ? (
                    <p>Loading problems...</p>
                ) : (
                    <>
                        <ControlsContainer>
                            <SelectContainer>
                                <label htmlFor='problem-select'>Problem:</label>
                                <select
                                    id='problem-select'
                                    value={selectedProblem}
                                    onChange={handleProblemChange}
                                    style={{
                                        padding: '0.5rem',
                                        borderRadius: '4px',
                                        border: '1px solid #ccc',
                                    }}
                                >
                                    {problems.map((problem) => (
                                        <option key={problem} value={problem}>
                                            {problem.split('_')[1]}
                                        </option>
                                    ))}
                                </select>
                            </SelectContainer>

                            <SelectContainer>
                                <label htmlFor='causal-links-select'>Links:</label>
                                <select
                                    id='causal-links-select'
                                    value={causalLinksCount}
                                    onChange={(e) => setCausalLinksCount(Number(e.target.value))}
                                    style={{
                                        padding: '0.5rem',
                                        borderRadius: '4px',
                                        border: '1px solid #ccc',
                                    }}
                                >
                                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                        <option key={num} value={num}>
                                            {num}
                                        </option>
                                    ))}
                                </select>
                            </SelectContainer>
                        </ControlsContainer>

                        <ProblemVisualizer
                            problemId={selectedProblem}
                            causalLinksCount={causalLinksCount}
                        />
                    </>
                )}
            </VisualizerContainer>
            <Footer />
        </Layout>
    )
}
