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
        // Get list of available problems and their nicknames
        const fetchProblems = async () => {
            try {
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
                
                // Fetch nicknames for all problems
                const nicknames = {}
                for (const problemId of availableProblems) {
                    try {
                        // Use a more direct import path
                        const problemResponse = await import(`./data/${selectedModel}/${selectedSolutionType}/${problemId}/problem.json`)
                        if (problemResponse.default && problemResponse.default.nickname) {
                            nicknames[problemId] = problemResponse.default.nickname[0].toUpperCase() + problemResponse.default.nickname.slice(1).toLowerCase()
                        } else {
                            nicknames[problemId] = problemId.split('_')[1] // fallback to number
                        }
                    } catch (error) {
                        console.warn(`Could not fetch nickname for ${problemId}`)
                        nicknames[problemId] = problemId.split('_')[1] // fallback to number
                    }
                }
                
                setProblems(availableProblems)
                setProblemNicknames(nicknames)
                setLoading(false)
            } catch (error) {
                console.error('Error fetching problems:', error)
                setLoading(false)
            }
        }

        fetchProblems()
    }, [selectedModel, selectedSolutionType]) // Re-fetch when model or solution type changes

    const handleProblemChange = (e) => {
        setSelectedProblem(e.target.value)
    }

    const handleModelChange = (e) => {
        setSelectedModel(e.target.value)
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
                                        <option value="correct_base_solution">Correct</option>
                                        <option value="incorrect_base_solution">Incorrect</option>
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
