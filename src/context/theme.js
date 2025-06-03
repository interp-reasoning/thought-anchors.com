'use client'
import React from 'react'
import { ThemeContext } from 'styled-components'

import { theme } from '@/config/theme'

const Theme = ({ children }) => {
    return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

export default Theme
