/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'principled-attribution.com',
                port: '',
            },
        ],
    },
    compiler: {
        styledComponents: true,
    },
}

export default nextConfig
