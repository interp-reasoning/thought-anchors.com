'use client'
import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
    StyledCopyright,
    StyledFooter,
    StyledLink,
    StyledLinks,
    StyledRightSide,
    StyledSocialsIcons,
} from './style'
import { footerItems } from '@/constant/footer'
import Paragraph from '../shared/paragraph'

const Footer = ({ showImage = false }) => {
    const { copyright, links, socials } = footerItems

    return (
        <StyledFooter>
            <div>
                <Link href='/' title='Home'>
                    <Image
                        style={{ borderRadius: '45%', opacity: showImage ? 1 : 0, width: '70px', height: '70px' }}
                        src={'/images/logo.webp'}
                        width={1000}
                        height={1000}
                        alt='Thought Anchors'
                    />
                </Link>
            </div>
            <StyledRightSide>
                <StyledLinks>
                    {links.map((item, index) => (
                        <StyledLink key={index} href={item.href} passHref>
                            {item.title}
                        </StyledLink>
                    ))}
                </StyledLinks>
                <StyledSocialsIcons>
                    {socials.map((item, index) => (
                        <Link
                            key={index}
                            href={item.href}
                            passHref
                            title={item.title}
                            target='_blank'
                            rel='noreferrer'
                        >
                            <Image src={item.image} alt={item.title} width={24} height={24} />
                        </Link>
                    ))}
                </StyledSocialsIcons>
                <StyledCopyright>
                    <Paragraph>{copyright}</Paragraph>
                </StyledCopyright>
            </StyledRightSide>
        </StyledFooter>
    )
}

export default Footer
