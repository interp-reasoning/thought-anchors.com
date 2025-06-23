/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'thought-anchors.com',
                port: '',
            },
        ],
    },
    compiler: {
        styledComponents: true,
    },
}

export default nextConfig
