'use client'
import React from 'react'
import { StyledLayout } from './style'
import { Raleway } from 'next/font/google'

const raleway = Raleway({ subsets: ['latin'], variable: '--font-raleway' })

const Layout = ({ children }) => {
    return <StyledLayout className={raleway.variable}>{children}</StyledLayout>
}

export default Layout
