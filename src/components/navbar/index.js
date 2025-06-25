'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { navbarItems } from '@/constant/navbar'
import NavbarCloseIcon from '@/assets/icons/navbar-close'
import HamburgerIcon from '@/assets/icons/hamburger'
import { StyledNavContainer, StyledNav, StyledLink, StyledNavItems, StyledNavButton } from './style'

const Navbar = ({ showImage = true }) => {
    const [showNavbar, setShowNavbar] = useState(false)

    return (
        <StyledNavContainer $showImage={showImage}>
            <Link href='/' title='Home'>
                <Image
                    style={{ borderRadius: '45%', opacity: showImage ? 1 : 0, width: '70px', height: '70px' }}
                    src={'/images/logo.webp'}
                    width={1000}
                    height={1000}
                    alt='Thought Anchors'
                />
            </Link>
            <StyledNav>
                <StyledNavItems $showNavbar={showNavbar}>
                    {navbarItems.length > 0 &&
                        navbarItems.map((item, index) => (
                            <StyledLink key={index} href={item.slug || item.href} passHref>
                            {item.name}
                        </StyledLink>
                    ))}
                </StyledNavItems>
                <StyledNavButton variant='link' onClick={() => setShowNavbar(!showNavbar)}>
                    {showNavbar ? <NavbarCloseIcon /> : <HamburgerIcon />}
                </StyledNavButton>
            </StyledNav>
        </StyledNavContainer>
    )
}

export default Navbar
