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
    // Blackmail
    situation_assessment: '#4285F4',   // Blue - understanding the problem
    leverage_analysis: '#EA4335',      // Red - identifying critical factors
    strategy_and_planning: '#34A853',  // Green - deciding what to do
    action_execution: '#FBBC05',       // Yellow - concrete output
    self_preservation: '#9C27B0',      // Purple - survival statements
    other: '#795548'                   // Brown - catch-all
}

// Format function tag for display
export const formatFunctionTag = (tag, abbrev = false) => {
    if (abbrev) {
        return tag
            .split('_')
            .map((word) => word.charAt(0).toUpperCase())
            .join('')
    }
    return tag
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
} 