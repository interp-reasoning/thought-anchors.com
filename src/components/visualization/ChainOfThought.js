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

    /* Mobile responsive chain container */
    @media (max-width: 875px) {
        flex: none;
        width: 100%;
        min-width: auto;
        order: 1; /* Chain of thought comes first on mobile */
        max-height: 50vh;
    }
    
    @media (max-width: 650px) {
        border-radius: 6px;
        max-height: 40vh;
        
        ${props => props.isCollapsed && `
            min-width: 60px;
            max-width: 60px;
        `}
    }
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

    /* Mobile responsive header */
    @media (max-width: 650px) {
        padding: 0.75rem;
        
        h3 {
            font-size: 1rem;
            margin: 0;
        }
        
        ${props => props.isCollapsed && `
            padding: 0.75rem 0.4rem;
            
            h3 {
                font-size: 0.7rem;
            }
        `}
    }
`

const ToggleButton = styled.button.withConfig({
    shouldForwardProp: (prop) => prop !== 'isCollapsed',
})`
    padding: 0.25rem 0.5rem;
    background: #007bff;
    color: white;
    border: none;
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

    /* Mobile responsive toggle */
    @media (max-width: 650px) {
        padding: 0.3rem 0.4rem;
        font-size: 0.8rem;
        
        ${props => props.isCollapsed && `
            padding: 0.4rem 0.2rem;
            font-size: 0.9rem;
        `}
    }
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

    /* Mobile responsive list */
    @media (max-width: 650px) {
        padding: 0.4rem;
    }
`

const ChainStep = styled.div.withConfig({
    shouldForwardProp: (prop) => !['color', 'importance', 'isSelected', 'isHighlighted'].includes(prop),
})`
    padding: 0.75rem;
    margin-bottom: 0.5rem;
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

    /* Mobile responsive step */
    @media (max-width: 650px) {
        padding: 0.5rem;
        margin-bottom: 0.4rem;
        border-radius: 4px;
        border-left-width: 3px;
        
        &:hover {
            transform: translateX(2px);
        }
        
        ${props => props.isSelected && `
            transform: translateX(2px);
        `}
        
        ${props => props.isHighlighted && `
            transform: translateX(3px);
        `}
    }
`

const StepNumber = styled.div.withConfig({
    shouldForwardProp: (prop) => prop !== 'color',
})`
    position: absolute;
    top: -8px;
    left: -8px;
    background: ${props => props.color};
    color: white;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: bold;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

    /* Mobile responsive step number */
    @media (max-width: 650px) {
        width: 20px;
        height: 20px;
        font-size: 0.7rem;
        top: -6px;
        left: -6px;
        border-width: 1px;
    }
`

const StepHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
    gap: 0.75rem;

    /* Mobile responsive step header */
    @media (max-width: 650px) {
        margin-bottom: 0.4rem;
        gap: 0.5rem;
        flex-direction: column;
        align-items: flex-start;
    }
`

const StepFunction = styled.span`
    display: flex;
    font-size: 0.75rem;
    font-weight: 600;
    color: #444;
    background: rgba(255, 255, 255, 0.8);
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.1);

    /* Mobile responsive step function */
    @media (max-width: 650px) {
        font-size: 0.7rem;
        padding: 0.2rem 0.4rem;
        border-radius: 8px;
    }
`

const ImportanceScore = styled.span`
    font-size: 0.75rem;
    font-weight: 600;
    color: #666;
    background: rgba(255, 255, 255, 0.9);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    border: 1px solid rgba(0, 0, 0, 0.1);

    /* Mobile responsive importance score */
    @media (max-width: 650px) {
        font-size: 0.7rem;
        padding: 0.2rem 0.4rem;
    }
`

const StepText = styled.div`
    font-size: 0.875rem;
    line-height: 1.4;
    color: #333;
    background: rgba(255, 255, 255, 0.9);
    padding: 0.5rem;
    border-radius: 4px;
    border: 1px solid rgba(0, 0, 0, 0.1);

    /* Mobile responsive step text */
    @media (max-width: 650px) {
        font-size: 0.8rem;
        line-height: 1.3;
        padding: 0.4rem;
    }
`

const CollapsedView = styled.div`
    padding: 1rem;
    text-align: center;
    color: #666;

    /* Mobile responsive collapsed view */
    @media (max-width: 650px) {
        padding: 0.75rem;
        font-size: 0.875rem;
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
    scrollToNode = null
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
                <h3>Chain-of-thought</h3>
                <ToggleButton 
                    isCollapsed={isCollapsed}
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    {isCollapsed ? '→' : '←'}
                </ToggleButton>
            </ChainHeader>
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