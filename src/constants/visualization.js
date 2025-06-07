// Define color mapping for function tags
export const functionTagColors = {
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
export const formatFunctionTag = (tag) => {
    return tag
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
} 