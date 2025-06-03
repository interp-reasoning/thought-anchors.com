import styled, { css } from 'styled-components'

export const sizes = (theme) => {
    return {
        sm: {
            padding: '0.5rem 1.5rem',
            marginBottom: '1rem',
            fontSize: '0.875rem',
            height: '36px',
        },
        md: {
            padding: '0.75rem 1.5rem',
            marginBottom: '1.5rem',
            fontSize: '1rem',
            height: '44px',
        },
        lg: {
            padding: '1rem 4rem',
            marginBottom: '2rem',
            fontSize: '1.15rem',
            height: '54px',
            width: '300px',
        },
    }
}

const variants = (theme) => {
    return {
        primary: {
            backgroundImage: theme.buttonGradient,
            color: theme.white,

            '&:hover': {
                color: theme.white,
            },
        },
        secondary: {
            backgroundColor: theme.white,
            color: theme.tertiary,
        },
        tertiary: {
            backgroundColor: theme.white,
            color: theme.white,
            padding: '14px 28px',
            height: '49px',
        },
        outline: {
            backgroundColor: 'transparent',
            border: `1px solid ${theme.border}`,
            color: theme.secondary,
        },
        link: {
            backgroundColor: 'transparent',
            color: theme.tertiary,
            padding: '1rem 0',
        },
    }
}

export const StyledButton = styled.button`
    ${({ theme, $variant, $size, $fullWidth, $widthAuto }) => css`
        padding: 0.5rem 1.5rem;
        font-size: 1rem;
        border: none;
        cursor: pointer;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        text-decoration: none;
        gap: 0.5rem;

        ${sizes(theme)[$size]};
        ${variants(theme)[$variant]};
        ${$fullWidth && 'width: 100%;'}
        ${$widthAuto &&
        css`
      width: auto;
      padding: 0 1.5rem;
      min-width: 300px;
      }
    `}
    `}
`
