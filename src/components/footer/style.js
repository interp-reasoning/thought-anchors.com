import Link from 'next/link'
import styled, { css } from 'styled-components'

export const StyledFooter = styled.footer`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2rem 0;
`

export const StyledRightSide = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 2rem;
`

export const StyledLinks = styled.div`
    ${({ theme }) => css`
        display: none;
        gap: 1rem;
        @media (min-width: ${theme.deviceSizes.desktop}px) {
            display: flex;
        }
    `}
`

export const StyledLink = styled(Link)`
    text-decoration: none;
    color: ${({ theme }) => theme.primary};
    font-size: 18px;
    font-weight: 300;
    letter-spacing: -0.18px;
`

export const StyledSocialsIcons = styled.div`
    display: flex;
    gap: 1rem;
    margin: 0 22px;
`

export const StyledCopyright = styled.div`
    ${({ theme }) => css`
        display: none;
        @media (min-width: ${theme.deviceSizes.desktop}px) {
            display: flex;
        }
    `}
`
