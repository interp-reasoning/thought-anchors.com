import styled from 'styled-components'

export const VisualizerContainer = styled.div`
    padding: 2rem 0rem 2rem 0rem;
    max-width: 100%;
    margin: 0 auto;
`

export const Title = styled.h1`
    font-size: 2rem;
    margin-bottom: 1.5rem;
    color: #333;
`

export const VisualizerWrapper = styled.div`
    display: flex;
    flex-direction: row;
    gap: 1rem;
    height: 80vh;
    align-items: stretch;
    transition: all 0.3s ease;
`

export const GraphContainer = styled.div`
    flex: 2;
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
    background: #f9f9f9;
    position: relative;
    transition: flex 0.3s ease;
`

export const ProblemBox = styled.div`
    padding: 1rem;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    margin-bottom: 1rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
`

export const DetailPanel = styled.div.withConfig({
    shouldForwardProp: (prop) => prop !== 'visible',
})`
    flex: 1;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 1rem;
    background: white;
    overflow-y: auto;
    max-width: 400px;
    min-width: 300px;
    display: ${(props) => (props.visible ? 'block' : 'none')};
    transition: all 0.3s ease;
`

export const LoadingIndicator = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    font-size: 1.2rem;
    color: #666;
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
`

export const LegendRow = styled.div`
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
`

export const LegendItem = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
`

export const ControlsContainer = styled.div`
    display: flex;
    flex-direction: row;
    gap: 2rem;
    margin-bottom: 1rem;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
`

export const SelectContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
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
`

export const NavigationControls = styled.div`
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 1rem;
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
` 