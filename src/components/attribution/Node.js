'use client'
import { functionTagColors, formatFunctionTag } from '@/constants/visualization'

// Helper function to wrap text within a given width
const wrapText = (text, maxCharsPerLine = 20) => {
  if (!text) return ['']
  
  const words = text.split(' ')
  const lines = []
  let currentLine = ''
  
  for (const word of words) {
    // If adding this word would exceed the line length
    if ((currentLine + ' ' + word).length > maxCharsPerLine) {
      // If current line is not empty, push it and start a new line
      if (currentLine) {
        lines.push(currentLine.trim())
        currentLine = word
      } else {
        // Word is too long, split it
        if (word.length > maxCharsPerLine) {
          lines.push(word.slice(0, maxCharsPerLine - 1) + '…')
          currentLine = ''
        } else {
          currentLine = word
        }
      }
    } else {
      // Add word to current line
      currentLine = currentLine ? currentLine + ' ' + word : word
    }
  }
  
  // Add the last line if not empty
  if (currentLine) {
    lines.push(currentLine.trim())
  }
  
  // Limit to 3 lines maximum
  if (lines.length > 3) {
    lines[2] = lines[2].slice(0, -1) + '…'
    return lines.slice(0, 3)
  }
  
  return lines
}

export default function Node({ 
  node, 
  pos, 
  chunk, 
  isSelected, 
  isHovered = false,
  nodeW = 170, 
  nodeH = 70,
  opacity = 1.0,
  onNodeHover,
  onNodeLeave,
  onNodeClick
}) {
  const tag = chunk.function_tags?.[0] || 'default'
  const color = functionTagColors[tag] || '#999'
  const summaryText = chunk?.summary?.replace('\\)', ')').replace('\\(', '(') || chunk?.chunk || ''
  
  // Mobile-responsive font sizes
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 650
  const titleFontSize = isMobile ? "0.85em" : "1.05em"
  const textFontSize = isMobile ? "0.65em" : "0.8em"
  const maxCharsPerLine = isMobile ? 12 : 16

  // Wrap the text into multiple lines with mobile-responsive char limit
  const textLines = wrapText(summaryText, maxCharsPerLine)
  const lineHeight = 12
  const totalTextHeight = textLines.length * lineHeight
  
  // Calculate starting Y position to center the text vertically in the lower half
  const textStartY = pos.y + 4 - (totalTextHeight / 2) + lineHeight

  return (
    <g>
      <rect
        x={pos.x - nodeW/2}
        y={pos.y - nodeH/2}
        width={nodeW}
        height={nodeH}
        rx={8}
        ry={8}
        fill={'#f9f9f9'}
      />
      <rect
        x={pos.x - nodeW/2}
        y={pos.y - nodeH/2}
        width={nodeW}
        height={nodeH}
        rx={8}
        ry={8}
        fill={color}
        stroke={'#ddd'}
        strokeWidth={2}
        opacity={opacity}
        style={{ cursor: 'pointer' }}
        onMouseEnter={(e) => {
          if (onNodeHover) {
            const nodeData = {
              id: node.idx,
              text: chunk.chunk || chunk.summary,
              functionTag: tag,
              importance: Math.abs(chunk.importance) || 0.01,
              dependsOn: chunk.depends_on,
            }
            onNodeHover(e, nodeData)
          }
        }}
        onMouseLeave={(e) => {
          if (onNodeLeave) {
            onNodeLeave(e)
          }
        }}
        onClick={(e) => {
          if (onNodeClick) {
            const nodeData = {
              id: node.idx,
              text: chunk.chunk || chunk.summary,
              functionTag: tag,
              importance: Math.abs(chunk.importance) || 0.01,
              dependsOn: chunk.depends_on,
            }
            onNodeClick(nodeData)
          }
        }}
      />
      {isSelected && (
        <rect
          x={pos.x - nodeW/2}
          y={pos.y - nodeH/2}
          width={nodeW}
          height={nodeH}
          rx={8}
          ry={8}
          fill={'transparent'}
          stroke={'#333'}
          strokeWidth={3}
          style={{ cursor: 'pointer' }}
          onMouseEnter={(e) => {
            if (onNodeHover) {
              const nodeData = {
                id: node.idx,
                text: chunk.chunk || chunk.summary,
                functionTag: tag,
                importance: Math.abs(chunk.importance) || 0.01,
                dependsOn: chunk.depends_on,
              }
              onNodeHover(e, nodeData)
            }
          }}
          onMouseLeave={(e) => {
            if (onNodeLeave) {
              onNodeLeave(e)
            }
          }}
          onClick={(e) => {
            if (onNodeClick) {
              const nodeData = {
                id: node.idx,
                text: chunk.chunk || chunk.summary,
                functionTag: tag,
                importance: Math.abs(chunk.importance) || 0.01,
                dependsOn: chunk.depends_on,
              }
              onNodeClick(nodeData)
            }
          }}
        />
      )}
      {isHovered && !isSelected && (
        <rect
          x={pos.x - nodeW/2}
          y={pos.y - nodeH/2}
          width={nodeW}
          height={nodeH}
          rx={8}
          ry={8}
          fill={'transparent'}
          stroke={'#666'}
          strokeWidth={3}
          style={{ cursor: 'pointer' }}
          onMouseEnter={(e) => {
            if (onNodeHover) {
              const nodeData = {
                id: node.idx,
                text: chunk.chunk || chunk.summary,
                functionTag: tag,
                importance: Math.abs(chunk.importance) || 0.01,
                dependsOn: chunk.depends_on,
              }
              onNodeHover(e, nodeData)
            }
          }}
          onMouseLeave={(e) => {
            if (onNodeLeave) {
              onNodeLeave(e)
            }
          }}
          onClick={(e) => {
            if (onNodeClick) {
              const nodeData = {
                id: node.idx,
                text: chunk.chunk || chunk.summary,
                functionTag: tag,
                importance: Math.abs(chunk.importance) || 0.01,
                dependsOn: chunk.depends_on,
              }
              onNodeClick(nodeData)
            }
          }}
        />
      )}
      <text
        x={pos.x}
        y={pos.y - 8}
        fontWeight="bold"
        fontSize={titleFontSize}
        fill="#222"
        fillOpacity={Math.max(0.7, opacity)}
        textAnchor="middle"
        style={{ cursor: 'pointer', pointerEvents: 'none' }}
      >
        {node.idx}: {formatFunctionTag(tag, true)}
      </text>
      {textLines.map((line, index) => (
        <text
          key={index}
          x={pos.x}
          y={textStartY + (index * lineHeight) + 6}
          fontSize={textFontSize}
          fill="#222"
          fillOpacity={Math.max(0.7, opacity)}
          textAnchor="middle"
          style={{ cursor: 'pointer', pointerEvents: 'none' }}
        >
          {line}
        </text>
      ))}
    </g>
  )
} 