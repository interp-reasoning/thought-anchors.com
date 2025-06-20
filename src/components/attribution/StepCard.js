'use client'
import styled from 'styled-components'
import { functionTagColors, formatFunctionTag } from '@/constants/visualization'
import { processMathText } from '@/utils/textProcessing'

const Card = styled.span`
  display: inline-block;
  border-radius: 12px;
  padding: 0.2em 0.5em;
  margin: 0 0.1em 0 0;
  font-size: 1.05rem;
  font-weight: 500;
  color: #222;
  background: ${({ color, importance }) => {
    const base = color || '#e5eaf2';
    const opacity = Math.min(0.18 + Math.abs(importance) * 0.7, 0.92);
    const hex = base.replace('#', '');
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r},${g},${b},${opacity})`;
  }};
  border-bottom: 2.5px solid ${({ color }) => color || '#e5eaf2'};
  transition: background 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  white-space: pre-line;
  line-height: 1.7;
`

const FunctionTag = styled.span`
  font-size: 0.78rem;
  font-weight: 600;
  color: #fff;
  background: ${({ color }) => color};
  border-radius: 8px;
  padding: 0.13em 0.7em;
  margin-right: 0.6em;
  letter-spacing: 0.01em;
  box-shadow: 0 1px 4px rgba(0,0,0,0.07);
  align-self: flex-start;
`

const ImportanceScore = styled.span`
  font-size: 0.78rem;
  color: #555;
  background: #f7f8fa;
  border-radius: 8px;
  padding: 0.13em 0.7em;
  margin-right: 0.7em;
  font-weight: 500;
  align-self: flex-start;
`

export default function StepCard({ 
  chunk, 
  idx, 
  isSelected, 
  onMouseEnter, 
  onClick 
}) {
  const tag = chunk.function_tags?.[0] || 'default'
  const color = functionTagColors[tag] || functionTagColors.default

  return (
    <Card
      color={color}
      importance={chunk.importance}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      style={isSelected ? { outline: `2.5px solid #333`, zIndex: 2 } : {}}
    >
      <FunctionTag color={color}>{formatFunctionTag(tag)}</FunctionTag>
      <ImportanceScore>{chunk.importance?.toFixed(2)}</ImportanceScore>
      <span style={{display: 'inline'}}>{processMathText(chunk.chunk)}</span>
    </Card>
  )
} 