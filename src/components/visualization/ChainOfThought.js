'use client'
import { useState, useEffect, useRef } from 'react'
import { functionTagColors, formatFunctionTag } from '@/constants/visualization'
import { processMathText } from '@/utils/textProcessing'
import styled from 'styled-components'

const ChainContainer = styled.div.withConfig({
    shouldForwardProp: (prop) => prop !== 'isCollapsed',
})`
    flex: 1;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: white;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    max-height: 90vh;
    min-width: 275px;
    transition: all 0.3s ease;
    
    ${props => props.isCollapsed && `
        flex: 0;
        min-width: 75px;
        max-width: 75px;
    `}
`

const ChainHeader = styled.div.withConfig({
    shouldForwardProp: (prop) => prop !== 'isCollapsed',
})`
    padding: 1rem;
    border-bottom: 1px solid #ddd;
    background: #f8f9fa;
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    ${props => props.isCollapsed && `
        flex-direction: column;
        writing-mode: vertical-lr;
        text-orientation: mixed;
        padding: 1rem 0.5rem;
        border-bottom: none;
        height: 100%;
        justify-content: flex-start;
        align-items: center;
        gap: 1rem;
        
        h3 {
            margin: 0;
            font-size: 0.75rem;
            writing-mode: vertical-lr;
            text-orientation: mixed;
        }
    `}
`

const ToggleButton = styled.button.withConfig({
    shouldForwardProp: (prop) => prop !== 'isCollapsed',
})`
    padding: 0.25rem 0.5rem;
    background: lightgray;
    color: white;
    border: none;
    display: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
    
    &:hover {
        background: #0056b3;
    }
    
    ${props => props.isCollapsed && `
        writing-mode: horizontal-tb;
        padding: 0.5rem 0.25rem;
        font-size: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
    `}
`

const ChainList = styled.div.withConfig({
    shouldForwardProp: (prop) => prop !== 'isCollapsed',
})`
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;

    /* Hide scrollbar by default */
    scrollbar-width: none;  /* Firefox */
    -ms-overflow-style: none;  /* IE and Edge */
    &::-webkit-scrollbar {
        display: none;  /* Chrome, Safari, Opera */
    }
    
    ${props => props.isCollapsed && `
        display: none;
    `}
`

const ChainStep = styled.div.withConfig({
    shouldForwardProp: (prop) => !['color', 'importance', 'isSelected', 'isHighlighted'].includes(prop),
})`
    padding: 0.75rem;
    margin-bottom: 0.75rem;
    border-radius: 6px;
    border-left: 4px solid ${props => props.color};
    background: ${props => {
        const opacity = Math.min(0.8, Math.max(0.1, props.importance * 2));
        return `${props.color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
    }};
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    
    &:hover {
        transform: translateX(4px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        background: ${props => {
            const opacity = Math.min(0.9, Math.max(0.2, props.importance * 2 + 0.1));
            return `${props.color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
        }};
    }
    
    ${props => props.isSelected && `
        background: ${props.color}AA !important;
        box-shadow: 0 0 0 2px ${props.color};
        transform: translateX(4px);
    `}
    
    ${props => props.isHighlighted && `
        background: ${props.color}DD !important;
        box-shadow: 0 0 0 2px ${props.color}, 0 4px 12px rgba(0, 0, 0, 0.2);
        transform: translateX(6px);
    `}

    overflow-y: visible;
`

const StepNumber = styled.div.withConfig({
    shouldForwardProp: (prop) => prop !== 'color',
})`
    position: absolute;
    top: -10px;
    left: -13px;
    background: ${props => props.color};
    color: white;
    border-radius: 50%;
    width: 31px;
    height: 31px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    font-weight: bold;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`

const StepHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
    gap: 0.75rem;
`

const StepFunction = styled.span`
    display: flex;
    font-size: 0.9rem;
    font-weight: 600;
    color: #444;
    background: rgba(255, 255, 255, 0.8);
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.1);
`

const ImportanceScore = styled.span`
    font-size: 0.9rem;
    font-weight: 600;
    color: #666;
    background: rgba(255, 255, 255, 0.9);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    border: 1px solid rgba(0, 0, 0, 0.1);
`

const StepText = styled.div`
    font-size: 1rem;
    line-height: 1.4;
    color: #333;
    background: rgba(255, 255, 255, 0.9);
    padding: 0.5rem;
    border-radius: 4px;
    border: 1px solid rgba(0, 0, 0, 0.1);
`

const ProblemInfoBox = styled.div`
    padding: 0.75rem;
    background: white;
    border-bottom: 1px solid #ddd;
    border-radius: 0px;
    margin-bottom: 0.25rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    position: relative;

    /* Mobile responsive problem info */
    @media (max-width: 650px) {
        padding: 0.6rem;
        margin-bottom: 0.75rem;
        border-radius: 4px;
        
        h4 {
            font-size: 0.9rem;
            margin-bottom: 0.4rem;
        }
        
        p {
            font-size: 0.8rem;
            line-height: 1.3;
        }
    }
`

const AnalyzeButton = styled.button`
    position: absolute;
    bottom: 0.75rem;
    right: 0.75rem;
    padding: 0.5rem 1rem;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 600;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 123, 255, 0.2);

    &:hover:not(:disabled) {
        background: #0056b3;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);
    }

    &:active:not(:disabled) {
        transform: translateY(0);
        box-shadow: 0 2px 4px rgba(0, 123, 255, 0.2);
    }

    &:disabled {
        background: #6c757d;
        cursor: not-allowed;
        opacity: 0.7;
    }

    @media (max-width: 650px) {
        bottom: 0.6rem;
        right: 0.6rem;
        padding: 0.4rem 0.8rem;
        font-size: 0.8rem;
    }
`

const ChainOfThought = ({ 
    chunksData, 
    stepImportanceData, 
    selectedNode, 
    hoveredNode,
    onStepHover, 
    onStepClick,
    onStepLeave,
    causalLinksCount = 3,
    hoveredFromCentralGraph = false,
    scrollToNode = null,
    problemData = null,
    summaryData = null,
    onAnalyzeCoT = null,
    isAnimating = false
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [hoveredStep, setHoveredStep] = useState(null)
    const chainListRef = useRef(null)

    // Auto-scroll only for hovered nodes from central graph (not selected nodes)
    useEffect(() => {
        if (hoveredNode && hoveredFromCentralGraph && chainListRef.current && !isCollapsed) {
            const stepElement = chainListRef.current.querySelector(`[data-step-id="${hoveredNode.id}"]`)
            if (stepElement) {
                // Calculate scroll position to center the element within the container
                const container = chainListRef.current
                const containerRect = container.getBoundingClientRect()
                const elementRect = stepElement.getBoundingClientRect()
                
                // Calculate the scroll position to center the element
                const scrollTop = container.scrollTop + elementRect.top - containerRect.top - (containerRect.height / 2) + (elementRect.height / 2)
                
                // Smooth scroll within the container only
                container.scrollTo({
                    top: scrollTop,
                    behavior: 'smooth'
                })
            }
        }
    }, [hoveredNode, hoveredFromCentralGraph, isCollapsed])

    // Scroll to a specific node when requested (for detail panel clicks)
    useEffect(() => {
        if (scrollToNode && chainListRef.current && !isCollapsed) {
            const stepElement = chainListRef.current.querySelector(`[data-step-id="${scrollToNode}"]`)
            if (stepElement) {
                // Calculate scroll position to center the element within the container
                const container = chainListRef.current
                const containerRect = container.getBoundingClientRect()
                const elementRect = stepElement.getBoundingClientRect()
                
                // Calculate the scroll position to center the element
                const scrollTop = container.scrollTop + elementRect.top - containerRect.top - (containerRect.height / 2) + (elementRect.height / 2)
                
                // Smooth scroll within the container only
                container.scrollTo({
                    top: scrollTop,
                    behavior: 'smooth'
                })
            }
        }
    }, [scrollToNode, isCollapsed])

    // Get causal relationships for a step
    const getCausalRelationships = (stepId) => {
        const affects = []
        const affectedBy = []
        
        // Find what this step affects
        const stepData = stepImportanceData.find(step => step.source_chunk_idx === stepId)
        if (stepData?.target_impacts) {
            affects.push(...stepData.target_impacts
                .sort((a, b) => Math.abs(b.importance_score) - Math.abs(a.importance_score))
                .slice(0, causalLinksCount)
                .map(impact => impact.target_chunk_idx)
            )
        }
        
        // Find what affects this step
        stepImportanceData.forEach(step => {
            const impact = step.target_impacts?.find(impact => impact.target_chunk_idx === stepId)
            if (impact) {
                affectedBy.push(step.source_chunk_idx)
            }
        })
        
        return { affects, affectedBy }
    }

    const handleStepHover = (chunk) => {
        setHoveredStep(chunk.chunk_idx)
        onStepHover?.(chunk)
    }

    const handleStepLeave = () => {
        setHoveredStep(null)
        onStepLeave?.()
    }

    const handleStepClick = (chunk) => {
        onStepClick?.(chunk)
    }

    return (
        <ChainContainer isCollapsed={isCollapsed}>
            <ChainHeader isCollapsed={isCollapsed}>
                <h3>Chain-of-Thought</h3>
                <ToggleButton 
                    isCollapsed={isCollapsed}
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    {isCollapsed ? '→' : '←'}
                </ToggleButton>
            </ChainHeader>
            
            {!isCollapsed && (problemData || summaryData) && (
                <ProblemInfoBox>
                    {problemData?.nickname && (
                        <h4 style={{ marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: 600 }}>
                            Question:  {problemData.nickname[0].toLowerCase() + problemData.nickname.slice(1).toLowerCase()}
                        </h4>
                    )}
                    {problemData?.problem && (
                        <div style={{ marginBottom: '0.5rem' }}>
                            <p style={{ margin: 0, fontSize: '1.1rem' }}>
                                {processMathText(problemData.problem)}
                            </p>
                        </div>
                    )}
                    {problemData?.gt_answer && (
                        <div style={{ marginBottom: '0.5rem' }}>
                            <p style={{ margin: 0, fontSize: '1.05rem' }}>
                                <strong>Answer:</strong> {processMathText(problemData.gt_answer)}
                            </p>
                        </div>
                    )}
                    {summaryData?.num_chunks && (
                        <div>
                            <p style={{ margin: 0, fontSize: '1.05rem' }}>
                                <strong>Total steps:</strong> {summaryData.num_chunks}
                            </p>
                        </div>
                    )}
                    
                    {onAnalyzeCoT && (
                        <AnalyzeButton
                            onClick={onAnalyzeCoT}
                            disabled={isAnimating}
                        >
                            {isAnimating ? 'Analyzing...' : 'Analyze CoT'}
                        </AnalyzeButton>
                    )}
                </ProblemInfoBox>
            )}
            
            <ChainList ref={chainListRef} isCollapsed={isCollapsed}>
                {chunksData
                    .sort((a, b) => a.chunk_idx - b.chunk_idx)
                    .map((chunk) => {
                        const color = functionTagColors[chunk.function_tags[0]] || '#999'
                        const importance = Math.abs(chunk.importance) || 0.01
                        const isSelected = selectedNode?.id === chunk.chunk_idx
                        const isHighlighted = hoveredNode?.id === chunk.chunk_idx || hoveredStep === chunk.chunk_idx
                        const { affects, affectedBy } = getCausalRelationships(chunk.chunk_idx)
                        
                        return (
                            <ChainStep
                                key={chunk.chunk_idx}
                                data-step-id={chunk.chunk_idx}
                                color={color}
                                importance={importance}
                                isSelected={isSelected}
                                isHighlighted={isHighlighted}
                                onMouseEnter={() => handleStepHover(chunk)}
                                onMouseLeave={handleStepLeave}
                                onClick={() => handleStepClick(chunk)}
                            >
                                <StepNumber color={color}>
                                    {chunk.chunk_idx}
                                </StepNumber>
                                
                                <StepHeader>
                                    <StepFunction>
                                        {formatFunctionTag(chunk.function_tags[0])}
                                    </StepFunction>
                                    <ImportanceScore>
                                        Importance: {importance.toFixed(3)}
                                    </ImportanceScore>
                                </StepHeader>
                                
                                <StepText>
                                    {processMathText(chunk.chunk)}
                                </StepText>
                            </ChainStep>
                        )
                    })}
            </ChainList>
        </ChainContainer>
    )
}

export default ChainOfThought 