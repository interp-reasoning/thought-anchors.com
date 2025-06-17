import { MathJax } from 'better-react-mathjax'

export const processText = (text) => {
    // Replace double newlines with spaces
    let modifiedText = text.replaceAll('\n\n', ' ')
    // Escape dollar signs that might be causing issues
    return modifiedText
}

// Add a new function to process math expressions
export const processMathText = (text) => {
    if (!text) return ''

    // First, handle the basic text processing
    let processedText = processText(text)

    // Convert \boxed{...} to \boxed{...} with proper LaTeX delimiters
    processedText = processedText.replace(/\\boxed{([^}]+)}/g, '$$$1$$')

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