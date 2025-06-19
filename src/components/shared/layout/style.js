import styled, { css } from 'styled-components'

export const StyledLayout = styled.div`
    ${({ theme }) => css`
        margin-left: 1rem;
        margin-right: 1rem;
        transition: all 0.3s ease-in-out;

        @media (min-width: ${theme.deviceSizes.tablet}px) {
            margin-left: 2rem;
            margin-right: 2rem;
        }

        @media (min-width: ${theme.deviceSizes.desktop}px) {
            margin-left: 3rem;
            margin-right: 3rem;
        }

        @media (min-width: ${theme.deviceSizes.largeDesktop}px) {
            margin-left: 4rem;
            margin-right: 4rem;
        }
    `}
`
