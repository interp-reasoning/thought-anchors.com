import Link from 'next/link'
import styled, { css } from 'styled-components'
import Button from '../shared/button'

export const StyledNavContainer = styled.div`
    ${({ theme, $showImage = true }) => css`
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 2rem 0rem 1rem 0rem;
        background-color: ${theme.white};
        border-bottom: 1px solid ${theme.border};
        transition: all 0.3s ease-in-out;
        position: sticky;
        top: 0;
        z-index: 100;

        @media (max-width: ${theme.deviceSizes.tablet}px) {
            padding: ${$showImage ? '0.5rem 0rem 0.5rem 0rem' : '0rem 0rem 0rem 0rem'};
        }
    `};
`

export const StyledNav = styled.nav`
    ${({ theme }) => css`
        display: flex;
        justify-content: space-between;
        flex-direction: row-reverse;
        align-items: center;
        margin: 0;
        padding: 0;
        list-style: none;
        position: relative;
        @media (min-width: ${theme.deviceSizes.tablet}px) {
            flex-direction: row;
        }
    `};
`

export const StyledNavButton = styled(Button)`
    ${({ theme }) => css`
        display: none;
        margin-left: 1rem;
        padding: 0;
        @media (max-width: ${theme.deviceSizes.tablet}px) {
            display: flex;
        }
    `};
`

export const StyledNavItems = styled.div`
    ${({ theme, $showNavbar = false }) => css`
        display: flex;
        position: absolute;
        justify-content: flex-start;
        flex-direction: column;
        align-items: center;
        padding: 1rem 2rem;
        list-style: none;
        align-items: flex-end;
        top: 60px;
        width: 100vw;
        height: 100vh;
        background-color: ${theme.white};
        z-index: 999;
        ${$showNavbar ? 'right: 0%;' : 'right:-100vh;'}
        transition: all 0.3s;

        @media (min-width: ${theme.deviceSizes.tablet}px) {
            position: relative;
            flex-direction: row;
            position: relative;
            background-color: transparent;
            padding: 0;
            top: 0;
            right: unset;
            width: unset;
            height: unset;
        }
    `}
`

export const StyledLink = styled(Link)`
    color: ${({ theme }) => theme.primary};
    text-decoration: none;
    margin: 1rem 0;
    font-size: 20px;
    font-weight: 400;
    &:hover {
        opacity: 0.8;
    }
    @media (min-width: ${({ theme }) => theme.deviceSizes.tablet}px) {
        margin: 0 1rem;
    }
`
