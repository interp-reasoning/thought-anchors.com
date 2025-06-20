'use client'
import { functionTagColors, formatFunctionTag } from '@/constants/visualization'

export default function Node({ 
  node, 
  pos, 
  chunk, 
  isSelected, 
  nodeW = 160, 
  nodeH = 50 
}) {
  const tag = chunk.function_tags?.[0] || 'default'
  const color = functionTagColors[tag] || '#999'
  const text = chunk.chunk.length > 10 ? chunk.chunk.slice(0, 8) + '…' : chunk.chunk

  return (
    <g>
      <rect
        x={pos.x - nodeW/2}
        y={pos.y - nodeH/2}
        width={nodeW}
        height={nodeH}
        rx={14}
        fill={color}
        //fillOpacity={isSelected ? 0.95 : 0.7}
        fillOpacity={1.0}
        stroke={isSelected ? '#333' : color}
        strokeWidth={isSelected ? 3 : 1.5}
      />
      <text
        x={pos.x}
        y={pos.y - 4}
        fontWeight="bold"
        fontSize="1.05em"
        fill="#222"
        textAnchor="middle"
      >
        {node.idx}: {formatFunctionTag(tag, true)}
      </text>
      <text
        x={pos.x}
        y={pos.y + 14}
        fontSize="0.9em"
        fill="#222"
        textAnchor="middle"
      >
        {text}
      </text>
    </g>
  )
} 