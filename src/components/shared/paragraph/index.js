'use client'
import React from 'react'
import Link from 'next/link'

import { StyledParagraph } from './style'

const Markdown = ({ children }) => {
    const parts = children.split(/(\[.*?\]\(.*?\)|<br \/>)/g)
    return parts.map((part, index) => {
        const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/)
        if (linkMatch) {
            const [, linkText, href] = linkMatch
            return (
                <Link key={index} href={href} target='_blank' rel='noopener noreferrer'>
                    {linkText}
                </Link>
            )
        } else if (part === '<br />') {
            return (
                <span key={`${index}`}>
                    <br key={`${index}_0`} />
                    <br key={`${index}_1`} />
                </span>
            )
        } else {
            return <span key={`${index}_5`}>{part}</span>
        }
    })
}

const Paragraph = ({
    children,
    centered = false,
    centeredOnTablet = false,
    marginBottom = 0,
    isMarkdown = false,
}) => {
    return (
        <StyledParagraph
            $centered={centered}
            $centeredOnTablet={centeredOnTablet}
            $marginBottom={marginBottom}
        >
            {isMarkdown ? <Markdown>{children}</Markdown> : children}
        </StyledParagraph>
    )
}

export default Paragraph
