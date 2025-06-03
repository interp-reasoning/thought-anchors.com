import styled, { css } from 'styled-components'

export const StyledLayout = styled.div`
    ${({ theme }) => css`
        margin-left: 1rem;
        margin-right: 1rem;
        transition: all 0.3s ease-in-out;

        @media (min-width: ${theme.deviceSizes.tablet}px) {
            margin-left: 2.5rem;
            margin-right: 2.5rem;
        }

        @media (min-width: ${theme.deviceSizes.desktop}px) {
            margin-left: 3.5rem;
            margin-right: 3.5rem;
        }

        @media (min-width: ${theme.deviceSizes.largeDesktop}px) {
            margin-left: 7.5rem;
            margin-right: 7.5rem;
        }
    `}
`
