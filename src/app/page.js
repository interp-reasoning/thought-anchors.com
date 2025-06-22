'use client'
import { useState, useEffect } from 'react'
import Layout from '@/components/shared/layout'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import ProblemVisualizer from '@/components/visualization/ProblemVisualizer'
import {
    VisualizerContainer,
    Title,
    ControlsContainer,
    SelectContainer,
} from '@/styles/visualization'

export default function HomeScreen() {
    const [problems, setProblems] = useState([])
    const [selectedProblem, setSelectedProblem] = useState('problem_2238')
    const [loading, setLoading] = useState(true) 

    useEffect(() => {
        // Get list of available problems
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
                setProblems(availableProblems)
                setLoading(false)
            } catch (error) {
                console.error('Error fetching problems:', error)
                setLoading(false)
            }
        }

        fetchProblems()
    }, [])

    const handleProblemChange = (e) => {
        setSelectedProblem(e.target.value)
    }

    return (
        <Layout>
            <Navbar />
            <VisualizerContainer>
                <Title>⚓️ Thought Anchors: Which LLM Reasoning Steps Matter?</Title>
                <p style={{ 
                    fontSize: '1rem', 
                    color: '#666', 
                    marginBottom: '0.5rem',
                    textAlign: 'left',
                    alignSelf: 'flex-start',
                }}>
                    Interactive visualization tool for analyzing causal relationships and <strong>counterfactual importance attribution  </strong> 
                    in reasoning chains. Explore how different reasoning steps 
                    influence the final answer and downstream reasoning.
                </p>

                {loading ? (
                    <p>Loading problems...</p>
                ) : (
                    <>
                        <ControlsContainer>
                            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
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
                                            {problem.split('_')[1]}
                                        </option>
                                    ))}
                                </select>
                            </SelectContainer>
                            </div>

                            <div style={{ 
                                fontSize: '0.875rem', 
                                color: '#666',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-end',
                                gap: '0.25rem'
                            }}>
                                <div>💡 <strong>Hover</strong> over steps for quick preview</div>
                                <div>🔗 <strong>Click</strong> to lock selection and see details</div>
                                <div>📊 Weights are <strong>normalized</strong> for easier comparison</div>
                                <div>🎯 The <strong>most important step</strong> is highlighted by default</div>
                            </div>
                        </ControlsContainer>

                        <ProblemVisualizer
                            problemId={selectedProblem}
                            initialCausalLinksCount={3}
                            initialImportanceFilter={4}
                        />
                    </>
                )}
            </VisualizerContainer>
            <Footer />
        </Layout>
    )
}
