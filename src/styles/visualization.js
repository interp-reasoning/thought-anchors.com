import styled from 'styled-components'

export const Description = styled.p`
    font-size: 1rem;
    color: #666;
    margin-bottom: 1rem;
    text-align: left;
    align-self: flex-start;

    @media (max-width: 650px) {
        text-align: center;
        align-self: center;
        font-size: 0.875rem;
    }
`

export const Instructions = styled.div`
    font-size: 0.875rem;
    color: #666;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
    text-align: right;

    @media (max-width: 748px) {
        display: none;
    }
`
export const VisualizerContainer = styled.div`
    padding: 2rem 0rem 2rem 0rem;
    max-width: 100%;
    margin: 0 auto;
    overflow-y: auto;

    /* Hide scrollbar by default */
    scrollbar-width: none;  /* Firefox */
    -ms-overflow-style: none;  /* IE and Edge */
    &::-webkit-scrollbar {
        display: none;  /* Chrome, Safari, Opera */
    }

    /* Mobile responsive padding */
    @media (max-width: 650px) {
        padding: 1rem 0rem 1rem 0rem;
    }
`

export const Title = styled.h1`
    font-size: 2rem;
    margin-bottom: 1.5rem;
    color: #333;

    /* Mobile responsive title */
    @media (max-width: 650px) {
        font-size: 1.5rem;
        margin-bottom: 1rem;
        text-align: center;
    }
`

export const VisualizerWrapper = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 1rem;
    max-height: 80vh;
    align-items: stretch;
    transition: all 0.3s ease;

    /* Mobile responsive layout - stack vertically */
    @media (max-width: 875px) {
        flex-direction: column;
        max-height: none;
        gap: 0.75rem;
    }
    
    @media (max-width: 650px) {
        gap: 0.5rem;
    }
`

export const GraphContainer = styled.div`
    flex: 2;
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
    background: #f9f9f9;
    position: relative;
    transition: flex 0.3s ease;
    max-height: 90vh;

    /* Mobile responsive adjustments */
    @media (max-width: 875px) {
        flex: none;
        width: 100%;
        max-height: 85vh;
        order: 2; /* Graph comes after chain of thought on mobile */
    }
    
    @media (max-width: 650px) {
        max-height: 80vh;
        border-radius: 6px;
    }
`

export const ProblemBox = styled.div`
    padding: 1rem;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    margin-bottom: 1rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

    /* Mobile responsive problem box */
    @media (max-width: 650px) {
        padding: 0.75rem;
        margin-bottom: 0.75rem;
        border-radius: 6px;
        
        h3 {
            font-size: 1.1rem;
            margin-bottom: 0.5rem;
        }
        
        p {
            font-size: 0.875rem;
            line-height: 1.4;
        }
    }
`

export const DetailPanel = styled.div.withConfig({
    shouldForwardProp: (prop) => prop !== 'visible',
})`
    flex: 1;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 1rem;
    background: white;
    max-width: 400px;
    overflow-y: auto;
    min-width: 275px;
    display: ${(props) => (props.visible ? 'block' : 'none')};
    transition: all 0.3s ease;
    max-height: 90vh;

    /* Hide scrollbar by default */
    scrollbar-width: none;  /* Firefox */
    -ms-overflow-style: none;  /* IE and Edge */
    &::-webkit-scrollbar {
        display: none;  /* Chrome, Safari, Opera */
    }
    
    /* Mobile responsive detail panel */
    @media (max-width: 875px) {
        flex: none;
        width: 100%;
        max-width: none;
        min-width: auto;
        order: 3; /* Detail panel comes last on mobile */
        max-height: 70vh;
    }
    
    @media (max-width: 650px) {
        padding: 0.75rem;
        border-radius: 6px;
        max-height: 60vh;
        
        /* Adjust font sizes for mobile */
        h4 {
            font-size: 0.875rem;
        }
        
        p, span, div {
            font-size: 0.8rem;
            line-height: 1.3;
        }
        
        button {
            font-size: 0.8rem;
            padding: 0.4rem 0.8rem;
        }
    }
`

// New component for Chain of Thought to make it mobile-friendly
export const ChainOfThoughtContainer = styled.div`
    flex: 1;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 1rem;
    background: white;
    overflow-y: auto;
    max-height: 90vh;
    min-width: 275px;

    /* Hide scrollbar by default */
    scrollbar-width: none;  /* Firefox */
    -ms-overflow-style: none;  /* IE and Edge */
    &::-webkit-scrollbar {
        display: none;  /* Chrome, Safari, Opera */
    }

    /* Mobile responsive chain of thought */
    @media (max-width: 875px) {
        flex: none;
        width: 100%;
        min-width: auto;
        order: 1; /* Chain of thought comes first on mobile */
        max-height: 50vh;
    }
    
    @media (max-width: 650px) {
        padding: 0.75rem;
        border-radius: 6px;
        max-height: 40vh;
        
        /* Smaller text on mobile */
        .chunk-item {
            font-size: 0.8rem;
            line-height: 1.3;
            padding: 0.4rem;
        }
        
        .chunk-number {
            font-size: 0.75rem;
        }
    }
`

export const LoadingIndicator = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    justify-content: center;
    align-items: center;
    height: 100%;
    font-size: 1.2rem;
    color: #666;

    @media (max-width: 650px) {
        font-size: 1rem;
        padding: 2rem;
    }
`

export const Legend = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 1rem;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 0.95rem;

    /* Mobile responsive legend */
    @media (max-width: 650px) {
        padding: 0.75rem;
        margin-bottom: 0.75rem;
        border-radius: 6px;
        font-size: 0.85rem;
        
        h3 {
            font-size: 1rem;
            margin-bottom: 0.25rem;
        }
    }
`

export const LegendRow = styled.div`
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;

    /* Mobile responsive legend row */
    @media (max-width: 650px) {
        gap: 0.5rem;
        flex-direction: column;
        align-items: flex-start;
    }
`

export const LegendItem = styled.div.withConfig({
    shouldForwardProp: (prop) => prop !== 'dontShowOnMobile',
})`
    display: flex;
    align-items: center;
    gap: 0.5rem;

    /* Mobile responsive legend items */
    @media (max-width: 650px) {
        gap: 0.4rem;
        font-size: 0.8rem;
        
        svg {
            width: 25px;
            height: 8px;
        }
        
        span {
            font-size: 0.8rem;
        }

        display: ${(props) => (props.dontShowOnMobile ? 'none' : 'flex')};
    }
`

export const ControlsContainer = styled.div`
    display: flex;
    flex-direction: row;
    gap: 2rem;
    margin-bottom: 1rem;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;

    /* Mobile responsive controls - only affect mobile, not tablets/desktop */
    @media (max-width: 650px) {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
        margin-bottom: 0.75rem;
        
        /* Stack the instruction text vertically on mobile */
        > div:last-child {
            order: -1; /* Move instructions to top on mobile */
            text-align: center;
            font-size: 0.8rem;
            
            div {
                margin-bottom: 0.25rem;
            }
        }
    }
`

export const SelectContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;

    /* Mobile responsive selects */
    @media (max-width: 650px) {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.25rem;
        width: 100%;
        
        label {
            font-size: 0.875rem;
            font-weight: 600;
        }
        
        select {
            width: 100%;
            padding: 0.6rem;
            font-size: 0.9rem;
            border-radius: 6px;
        }
    }
`

export const HoverTooltip = styled.div`
    position: absolute;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    pointer-events: none;
    z-index: 1000;
    max-width: 200px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

    /* Mobile responsive tooltip */
    @media (max-width: 650px) {
        max-width: 150px;
        font-size: 0.7rem;
        padding: 0.4rem;
    }
`

export const NavigationControls = styled.div`
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 1rem;

    /* Mobile responsive navigation */
    @media (max-width: 650px) {
        gap: 0.4rem;
        margin-bottom: 0.75rem;
    }
`

export const NavButton = styled.button`
    padding: 0.5rem;
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.875rem;
    transition: all 0.2s ease;
    
    &:hover:not(:disabled) {
        background: #e9ecef;
        border-color: #adb5bd;
    }
    
    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    &.active {
        background: #007bff;
        color: white;
        border-color: #007bff;
    }

    /* Mobile responsive nav buttons */
    @media (max-width: 650px) {
        padding: 0.4rem;
        font-size: 0.8rem;
        
        p {
            font-size: 0.8rem;
            margin: 0;
        }
    }
`

export const VisualizationToggle = styled.div`
    display: flex;
    border: 1px solid #ccc;
    border-radius: 4px;
    overflow: hidden;
    background: white;

    /* Mobile responsive toggle */
    @media (max-width: 650px) {
        width: 100%;
    }
`

export const ToggleOption = styled.button.withConfig({
    shouldForwardProp: (prop) => prop !== 'active',
})`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border: none;
    background: ${props => props.active ? '#e3f2fd' : 'white'};
    color: ${props => props.active ? '#1976d2' : '#666'};
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s ease;
    border-right: 1px solid #ccc;
    
    &:last-child {
        border-right: none;
    }
    
    &:hover {
        background: ${props => props.active ? '#e3f2fd' : '#f5f5f5'};
    }
    
    svg {
        width: 16px;
        height: 16px;
    }

    /* Mobile responsive toggle options */
    @media (max-width: 650px) {
        flex: 1;
        justify-content: center;
        padding: 0.6rem 0.5rem;
        font-size: 0.8rem;
        
        svg {
            width: 14px;
            height: 14px;
        }
    }
` 