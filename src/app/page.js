'use client'
import { useState, useEffect, useRef } from 'react'
import Layout from '@/components/shared/layout'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import ProblemVisualizer from '@/components/visualization/ProblemVisualizer'
import {
    VisualizerContainer,
    Title,
    ControlsContainer,
    SelectContainer,
    Instructions,
    Description,
} from '@/styles/visualization'

export default function HomeScreen() {
    const [problems, setProblems] = useState([])
    const [selectedModel, setSelectedModel] = useState('deepseek-r1-distill-qwen-14b')
    const [selectedSolutionType, setSelectedSolutionType] = useState('correct_base_solution')
    const [selectedProblem, setSelectedProblem] = useState('problem_2238')
    const [loading, setLoading] = useState(true)
    const [windowWidth, setWindowWidth] = useState(0)
    const [problemNicknames, setProblemNicknames] = useState({})
    const [visualizationType, setVisualizationType] = useState('circle') // 'circle' or 'attribution'
    const resizeTimeoutRef = useRef(null)

    // Debounced window resize handler to prevent glitching
    useEffect(() => {
        const handleResize = () => {
            // Clear existing timeout
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current)
            }
            
            // Set new timeout for debounced resize
            resizeTimeoutRef.current = setTimeout(() => {
                setWindowWidth(window.innerWidth)
            }, 150) // 150ms debounce
        }

        // Set initial width immediately
        setWindowWidth(window.innerWidth)
        
        // Add resize listener
        window.addEventListener('resize', handleResize)
        
        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize)
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current)
            }
        }
    }, [])

    useEffect(() => {
        // Dynamically discover available problems/scenarios for the selected model and solution type
        const fetchProblems = async () => {
            try {
                // Define potential problems/scenarios to check for each model type
                const potentialProblems = [
                    // Standard problem format
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
                    // Scenario format
                    'scenario_0',
                ]
                
                const availableProblems = []
                const nicknames = {}
                
                // Check which problems/scenarios actually exist for this model/solution type
                for (const problemId of potentialProblems) {
                    try {
                        // Try scenario.json first, then problem.json
                        let problemData = null
                        try {
                            const scenarioResponse = await import(`./data/${selectedModel}/${selectedSolutionType}/${problemId}/scenario.json`)
                            problemData = scenarioResponse.default
                        } catch (e) {
                            try {
                                const problemResponse = await import(`./data/${selectedModel}/${selectedSolutionType}/${problemId}/problem.json`)
                                problemData = problemResponse.default
                            } catch (e2) {
                                // Neither exists, skip this problem
                                continue
                            }
                        }
                        
                        // If we got here, the problem exists
                        availableProblems.push(problemId)
                        
                        // Extract nickname
                        if (problemData && problemData.nickname) {
                            nicknames[problemId] = problemData.nickname[0].toUpperCase() + problemData.nickname.slice(1).toLowerCase()
                        } else if (problemId.startsWith('scenario_')) {
                            nicknames[problemId] = `Scenario ${problemId.split('_')[1]}`
                        } else {
                            nicknames[problemId] = `Problem ${problemId.split('_')[1]}`
                        }
                    } catch (error) {
                        // Problem doesn't exist for this model/solution type, skip it
                        continue
                    }
                }
                
                setProblems(availableProblems)
                setProblemNicknames(nicknames)
                
                // Auto-select first available problem if current selection is not available
                if (availableProblems.length > 0 && !availableProblems.includes(selectedProblem)) {
                    setSelectedProblem(availableProblems[0])
                }
                
                setLoading(false)
            } catch (error) {
                console.log('Error fetching problems:', error)
                setLoading(false)
            }
        }

        fetchProblems()
    }, [selectedModel, selectedSolutionType]) // Re-fetch when model or solution type changes

    const handleProblemChange = (e) => {
        setSelectedProblem(e.target.value)
    }

    const handleModelChange = (e) => {
        const newModel = e.target.value
        setSelectedModel(newModel)
        
        // Auto-adjust solution type based on models that were run on different solution types
        /* if (newModel === 'deepseek-r1' || newModel === 'qwq-32b') {
            if (!['no_base_solution', 'yes_base_solution'].includes(selectedSolutionType)) {
                if (newModel === 'deepseek-r1') {
                    setSelectedSolutionType('no_base_solution')
                } else {
                    setSelectedSolutionType('yes_base_solution')
                }
            }
        }*/ // TODO: Uncomment this when we have more data
        
        if (newModel === 'deepseek-r1') {
            setSelectedSolutionType('no_base_solution')
        } else if (newModel === 'qwq-32b') {
            setSelectedSolutionType('yes_base_solution')
        } else {
            // Other models use standard solution types
            if (!['correct_base_solution', 'incorrect_base_solution'].includes(selectedSolutionType)) {
                setSelectedSolutionType('correct_base_solution')
            }
        }
    }

    const handleSolutionTypeChange = (e) => {
        setSelectedSolutionType(e.target.value)
    }

    const handleVisualizationTypeChange = (newType) => {
        setVisualizationType(newType)
    }

    return (
        <Layout>
            <Navbar />
            <VisualizerContainer>
                <Title>⚓️ Thought Anchors: Which LLM Reasoning Steps Matter?</Title>
                <Description>
                    Interactive visualization tool for analyzing causal relationships and <strong>counterfactual importance attribution  </strong> 
                    in reasoning chains. Explore how different reasoning steps 
                    influence the final answer and downstream reasoning.
                </Description>

                {loading ? (
                    <p>Loading problems...</p>
                ) : (
                    <>
                        <ControlsContainer>
                            <div style={{ 
                                display: 'flex', 
                                gap: '0.4rem', 
                                alignItems: 'flex-start', 
                                flexDirection: 'column'
                            }}>
                                <SelectContainer>
                                        <label htmlFor='model-select' style={{ fontWeight: '600', marginRight: '1rem' }}>
                                            Model:
                                        </label>
                                    <select
                                        id='model-select'
                                        value={selectedModel}
                                        onChange={handleModelChange}
                                        style={{
                                            padding: '0.5rem',
                                            borderRadius: '4px',
                                            border: '1px solid #ccc',
                                            fontSize: '1rem',
                                            minWidth: '120px'
                                        }}
                                    >
                                        <option value="deepseek-r1-distill-qwen-14b">R1-Distill Qwen-14B</option>
                                        <option value="deepseek-r1-distill-llama-8b">R1-Distill Llama-8B</option>
                                        <option value="deepseek-r1">DeepSeek R1</option>
                                        <option value="qwq-32b">QwQ-32B</option>
                                    </select>
                                </SelectContainer>
                                <SelectContainer>
                                        <label htmlFor='solution-type-select' style={{ fontWeight: '600', marginRight: '0.1rem' }}>
                                            Solution:
                                        </label>
                                    <select
                                        id='solution-type-select'
                                        value={selectedSolutionType}
                                        onChange={handleSolutionTypeChange}
                                        style={{
                                            padding: '0.5rem',
                                            borderRadius: '4px',
                                            border: '1px solid #ccc',
                                            fontSize: '1rem',
                                            minWidth: '120px'
                                        }}
                                    >
                                        {selectedModel === 'deepseek-r1' || selectedModel === 'qwq-32b' ? (
                                            <>
                                                <option value="no_base_solution">No blackmailing</option>
                                                <option value="yes_base_solution">Blackmailing</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="correct_base_solution">Correct</option>
                                                <option value="incorrect_base_solution">Incorrect</option>
                                            </>
                                        )}
                                    </select>
                                </SelectContainer>
                                <SelectContainer>
                                        <label htmlFor='problem-select' style={{ fontWeight: '600' }}>
                                            Problem:
                                        </label>
                                    <select
                                        id='problem-select'
                                        value={selectedProblem}
                                        onChange={handleProblemChange}
                                        style={{
                                            padding: '0.5rem',
                                            borderRadius: '4px',
                                            border: '1px solid #ccc',
                                                fontSize: '1rem',
                                                minWidth: '120px'
                                        }}
                                    >
                                        {problems.map((problem) => (
                                            <option key={problem} value={problem}>
                                                {problemNicknames[problem]}
                                            </option>
                                        ))}
                                    </select>
                                </SelectContainer>
                            </div>

                            <Instructions>
                                <div>💡 <strong>Hover</strong> over steps for quick preview</div>
                                <div>🔗 <strong>Click</strong> to lock selection and see details</div>
                                <div>📊 Weights are <strong>normalized</strong> for easier comparison</div>
                                <div>🎯 The <strong>most important step</strong> is highlighted by default</div>
                            </Instructions>
                        </ControlsContainer>

                        <ProblemVisualizer
                            problemId={selectedProblem}
                            modelId={selectedModel}
                            solutionType={selectedSolutionType}
                            initialCausalLinksCount={3}
                            initialImportanceFilter={4}
                            windowWidth={windowWidth}
                            visualizationType={visualizationType}
                            onVisualizationTypeChange={handleVisualizationTypeChange}
                        />
                    </>
                )}
            </VisualizerContainer>
            <Footer />
        </Layout>
    )
}
