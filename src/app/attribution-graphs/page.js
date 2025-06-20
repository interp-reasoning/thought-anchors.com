'use client'
import { useState, useEffect, useRef } from 'react'
import styled from 'styled-components'
import { functionTagColors, formatFunctionTag } from '@/constants/visualization'
import { Legend, LegendRow, LegendItem } from '@/styles/visualization'
import AttributionGraph from '@/components/attribution/AttributionGraph'
import StepCard from '@/components/attribution/StepCard'

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f7f8fa;
`

const TopBar = styled.div`
  padding: 2rem 2rem 1rem 2rem;
  background: #fff;
  border-bottom: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const MainContent = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  padding: 2rem;
  gap: 2rem;
`

const LeftPanel = styled.div`
  flex: 1.2;
  min-width: 0;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  max-height: 80vh;
  overflow-y: auto;
`

const RightPanel = styled.div`
  flex: 1.5;
  min-width: 0;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  max-height: 80vh;
  overflow: hidden;
`

const ProblemSelect = styled.select`
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-size: 1rem;
  min-width: 120px;
  margin-left: 0.5rem;
`

export default function AttributionGraphsPage() {
  const [problems] = useState([
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
  ])
  const [problemId, setProblemId] = useState('problem_2238')
  const [causalLinksCount, setCausalLinksCount] = useState(3)
  const [chunksData, setChunksData] = useState([])
  const [solution, setSolution] = useState('')
  const [loading, setLoading] = useState(true)
  const [stepImportanceData, setStepImportanceData] = useState([])
  const [selectedStepIdx, setSelectedStepIdx] = useState(null)
  const [selectedPaths, setSelectedPaths] = useState([])

  // Refs for auto-scrolling
  const leftPanelRef = useRef(null)
  const stepCardRefs = useRef({})

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Load chunks_labeled.json to get the importance field
        const chunks = (await import(`../data/${problemId}/chunks_labeled.json`)).default
        const baseSol = (await import(`../data/${problemId}/base_solution.json`)).default
        let resStepImp = null
        try {
          resStepImp = (await import(`../data/${problemId}/step_importance.json`)).default
        } catch (e) {
          console.warn(`Step importance data not found for ${problemId}`)
        }
        let suppStepImp = null
        try {
          suppStepImp = (await import(`../data/${problemId}/step_importance_supp.json`)).default
        } catch (e) {
          console.warn(`Supplementary step importance data not found for ${problemId}`)
        }
        setChunksData(chunks)
        setSolution(baseSol.solution || '')
        setStepImportanceData(resStepImp || suppStepImp)

        setLoading(false)
      } catch (e) {
        setLoading(false)
      }
    }
    fetchData()
  }, [problemId])

  // Auto-select the most important step when data loads
  useEffect(() => {
    if (chunksData.length > 0 && selectedStepIdx === null) {
      // Find the chunk with the highest importance score
      const mostImportantChunk = chunksData.reduce((max, chunk) => {
        const currentImportance = Math.abs(chunk.importance) || 0
        const maxImportance = Math.abs(max.importance) || 0
        return currentImportance > maxImportance ? chunk : max
      })

      if (mostImportantChunk) {
        setSelectedStepIdx(mostImportantChunk.chunk_idx)
      }
    }
  }, [chunksData, selectedStepIdx])

  // Auto-scroll to selected step
  useEffect(() => {
    if (selectedStepIdx !== null && leftPanelRef.current && stepCardRefs.current[selectedStepIdx]) {
      const selectedElement = stepCardRefs.current[selectedStepIdx]
      const container = leftPanelRef.current
      
      // Calculate the position to scroll to (center the selected element)
      const containerRect = container.getBoundingClientRect()
      const elementRect = selectedElement.getBoundingClientRect()
      const scrollTop = container.scrollTop + elementRect.top - containerRect.top - containerRect.height / 2 + elementRect.height / 2
      
      container.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      })
    }
  }, [selectedStepIdx])

  // Compute delimiters between chunks by matching each chunk in the solution
  let chunkDelimiters = []
  if (chunksData.length > 0 && solution) {
    let indices = []
    let lastIdx = 0
    for (let i = 0; i < chunksData.length; ++i) {
      const chunk = chunksData[i].chunk
      const idx = solution.indexOf(chunk, lastIdx)
      if (idx === -1) break
      indices.push({ start: idx, end: idx + chunk.length })
      lastIdx = idx + chunk.length
    }
    for (let i = 0; i < indices.length - 1; ++i) {
      chunkDelimiters.push(solution.slice(indices[i].end, indices[i + 1].start))
    }
    // For the last chunk, just use empty string
    chunkDelimiters.push('')
  }

  // Update paths when selected step changes
  useEffect(() => {
    if (selectedStepIdx !== null && stepImportanceData.length > 0) {
      const paths = findPathsToNode(selectedStepIdx)
      setSelectedPaths(paths)
    } else {
      setSelectedPaths([])
    }
  }, [selectedStepIdx, stepImportanceData])

  // Modify findPathsToNode to create proper path structure
  const findPathsToNode = (targetIdx, maxDepth = 3) => {
    const paths = []
    const visited = new Set()

    const dfs = (currentIdx, currentPath, depth = 0) => {
      if (depth > maxDepth) return
      if (visited.has(currentIdx)) return

      visited.add(currentIdx)
      
      // Get incoming connections
      const incoming = getIncoming(currentIdx)
      console.log('For step', currentIdx, 'incoming', incoming)
      
      // Create node with sources
      const node = {
        idx: currentIdx,
        sources: incoming.map(inf => ({
          idx: inf.source,
          score: inf.importance
        }))
      }

      // Add node to path
      const newPath = [...currentPath, node]
      
      if (incoming.length === 0) {
        // This is a starting node
        paths.push(newPath)
      } else {
        // Continue DFS for each source
        incoming.forEach(inf => {
          dfs(inf.source, newPath, depth + 1)
        })
      }

      visited.delete(currentIdx)
    }

    dfs(targetIdx, [])
    return paths
  }

  // Modify getIncoming to handle importance threshold
  const getIncoming = (idx) => {
    if (!stepImportanceData || idx == null) return []
    
    // Get all positive influences for this node
    const influences = stepImportanceData
      .filter(s => s.target_impacts?.some(t => t.target_chunk_idx === idx && t.importance_score > 0))
      .map(s => {
        const impact = s.target_impacts.find(t => t.target_chunk_idx === idx)
        return { source: s.source_chunk_idx, importance: impact.importance_score }
      })
      .sort((a, b) => b.importance - a.importance)

    if (influences.length === 0) return []

    // Calculate mean importance
    const allScores = influences.map(inf => inf.importance)
    const meanImportance = allScores.reduce((a, b) => a + b, 0) / allScores.length

    // Get influences above mean, or at least the strongest one
    const strongInfluences = influences.filter(inf => inf.importance > meanImportance)
    return strongInfluences.length > 0 ? strongInfluences : [influences[0]]
  }

  console.log('selectedPaths', selectedPaths)

  return (
    <PageContainer>
      <TopBar>
        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>Attribution Graphs Explorer</div>
        <div style={{ color: '#666', fontSize: '1.05rem', maxWidth: 900 }}>
          Explore how each step in a chain of thought (CoT) influences others, and how attributions propagate through reasoning. Hover over a step or node to see its influences and dependents, inspired by Anthropic's interactive attribution graphs.
        </div>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <div>
            <label style={{ fontWeight: 600 }}>Problem: </label>
            <ProblemSelect value={problemId} onChange={e => setProblemId(e.target.value)}>
              {problems.map((problem) => (
                <option key={problem} value={problem}>
                  {problem.split('_')[1]}
                </option>
              ))}
            </ProblemSelect>
          </div>
          <div>
            <label style={{ fontWeight: 600 }}>Causal links: </label>
            <select value={causalLinksCount} onChange={e => setCausalLinksCount(Number(e.target.value))} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc', fontSize: '1rem', minWidth: 80 }}>
              {[0,1,2,3,4,5,6,7,8,9,10].map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>
        </div>
        <Legend>
          <LegendRow>
            {Object.entries(functionTagColors).map(([tag, color]) => (
              <LegendItem key={tag}>
                <span style={{ width: 18, height: 18, borderRadius: 4, display: 'inline-block', background: color, border: '1px solid #bbb' }} />
                {formatFunctionTag(tag)}
              </LegendItem>
            ))}
          </LegendRow>
        </Legend>
      </TopBar>
      <MainContent>
        <LeftPanel ref={leftPanelRef}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Chain of Thought (CoT)</div>
          <div style={{ lineHeight: 1.7 }}>
            {(() => {
              const paragraphNodes = [];
              for (let idx = 0; idx < chunksData.length; ++idx) {
                const chunk = chunksData[idx];
                paragraphNodes.push(
                  <div
                    key={`card-wrapper-${idx}`}
                    ref={el => stepCardRefs.current[idx] = el}
                    style={{ display: 'inline-block' }}
                  >
                    <StepCard
                      key={`card-${idx}`}
                      chunk={chunk}
                      idx={idx}
                      isSelected={selectedStepIdx === idx}
                      onMouseEnter={() => setSelectedStepIdx(idx)}
                      onClick={() => setSelectedStepIdx(idx)}
                    />
                  </div>
                );
                if (chunkDelimiters[idx]) {
                  paragraphNodes.push(
                    <span key={`delim-${idx}`} style={{ whiteSpace: 'pre-wrap' }}>{chunkDelimiters[idx]}</span>
                  );
                }
              }
              return paragraphNodes;
            })()}
          </div>
        </LeftPanel>
        <RightPanel>
          <div style={{ fontWeight: 600, marginBottom: 12, flex: '0 0 auto' }}>Attribution Graph</div>
          {selectedStepIdx != null && chunksData[selectedStepIdx] ? (
            <AttributionGraph
              selectedIdx={selectedStepIdx}
              chunksData={chunksData}
              selectedPaths={selectedPaths}
            />
          ) : (
            <div style={{ 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <span style={{ color: '#aaa', fontSize: '1.2rem' }}>
                Select a step to see its attribution graph
              </span>
            </div>
          )}
        </RightPanel>
      </MainContent>
    </PageContainer>
  )
} 