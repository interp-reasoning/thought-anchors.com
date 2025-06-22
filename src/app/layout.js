import { Raleway } from 'next/font/google'
import { GoogleAnalytics } from '@next/third-parties/google'
import Theme from '@/context/theme'
import StyledComponentsRegistry from '@/lib/registry'
import './globals.css'
import { MathJaxContext } from 'better-react-mathjax'
const raleway = Raleway({ subsets: ['latin'], variable: '--font-raleway' })

export const metadata = {
    robots: { index: true, follow: true },
    title: '⚓️ Thought Anchors',
    description: 'Thought Anchors: Which LLM Reasoning Steps Matter?',
}

// Configure MathJax options
const mathJaxConfig = {
    tex: {
        inlineMath: [
            ['$', '$'],
            ['\\(', '\\)'],
        ],
        displayMath: [
            ['$$', '$$'],
            ['\\[', '\\]'],
        ],
        processEscapes: true,
        processEnvironments: true,
    },
    options: {
        enableMenu: false, // Disable the context menu
        processing: {
            skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
        },
    },
    startup: {
        typeset: true,
    },
}

export default function RootLayout({ children }) {
    return (
        <MathJaxContext config={mathJaxConfig}>
            <html lang='en' className={raleway.variable}>
                <GoogleAnalytics gaId='G-2TE0TMT0N8' />
                <body>
                    <Theme>
                        <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
                    </Theme>
                </body>
            </html>
        </MathJaxContext>
    )
}
