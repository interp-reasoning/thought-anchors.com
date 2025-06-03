import React from 'react'
import { StyledButton } from './style'

const Button = ({
    variant = 'primary',
    size = 'md',
    children,
    onClick,
    fullWidth = false,
    widthAuto = false,
    renderAs = 'button',
    ...props
}) => {
    return (
        <StyledButton
            as={renderAs}
            onClick={onClick}
            {...props}
            $variant={variant}
            $size={size}
            $fullWidth={fullWidth}
            $widthAuto={widthAuto}
        >
            {children}
        </StyledButton>
    )
}

export default Button
