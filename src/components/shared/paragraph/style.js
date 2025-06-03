import styled, { css } from 'styled-components'

export const StyledParagraph = styled.p`
    ${({ theme, $centered, $centeredOnTablet, $marginBottom }) => css`
        font-size: 18px;
        letter-spacing: 0.5px;
        line-height: 140%;
        color: ${theme.primary};
        font-weight: 300;
        text-align: ${$centered ? 'center' : 'left'};
        margin-bottom: ${$marginBottom}px;

        @media (max-width: ${theme.deviceSizes.tablet}px) {
            font-size: 16px;
            line-height: 140%;
            text-align: ${$centeredOnTablet ? 'center' : 'left'};
        }
    `}
`
