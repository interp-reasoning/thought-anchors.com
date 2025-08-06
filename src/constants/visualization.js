// Define color mapping for function tags
export const functionTagColors = {
    problem_setup: '#4285F4',           // Blue
    plan_generation: '#EA4335',         // Red
    fact_retrieval: '#FBBC05',          // Yellow
    active_computation: '#34A853',      // Green
    uncertainty_management: '#9C27B0',  // Purple
    self_checking: '#FF9800',           // Orange
    result_consolidation: '#00BCD4',    // Cyan
    final_answer_emission: '#795548',   // Brown
    // Blackmail
    situation_assessment: '#4285F4',    // Blue - recalling, parsing, synthesizing facts
    leverage_identification: '#654321', // Dark brown - identifying exploitable vulnerabilities
    urgency_and_time: '#FFA500',        // Orange - emphasizing time constraints
    self_preservation: '#9C27B0',       // Purple - survival and continuation statements
    email_analysis: '#008080',          // Teal - processing and analyzing emails
    action_execution: '#2F4F4F',        // Dark slate gray - concrete output and actions
    structural_marker: '#00BCD4',       // Cyan - CoT structure artifacts
    action_marker: '#00BCD4',           // Cyan - functional action tags
    other: '#9E9E9E',                   // Light gray - conversational filler
    // Whistleblow
    evidence_assessment: '#4285F4',     // Blue - analyzing evidence and implications
    ethical_analysis: '#EA4335',        // Red - ethical principles and duties  
    risk_evaluation: '#34A853',         // Green - assessing risks
    regulatory_analysis: '#FBBC05',     // Yellow - legal or regulatory requirements
    stakeholder_impact: '#9C27B0',      // Purple - impact on stakeholders
    option_generation: '#00BCD4',       // Cyan - identifying possible actions
    consequence_analysis: '#FF9800',    // Orange - evaluating outcomes
    action_planning: '#8BC34A',         // Light green - planning concrete steps
    final_action: '#F44336',            // Red - concrete output action
    // Code
    algorithm_design: '#8B0000',        // Blue - designing algorithms
    deduction: '#FF69B4',               // Pink - deductive reasoning
    code_writing: '#34A853',            // Green - writing code
    verification: '#FFA500',            // Orange - verifying code
    answer_emission: '#795548',         // Brown - emitting code
    // Common
    other: '#795548'                    // Brown - catch-all
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