/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  transpilePackages: [
    "@deck.gl/core",
    "@deck.gl/layers",
    "@deck.gl/react",
    "@luma.gl/core",
    "@luma.gl/engine",
    "@loaders.gl/core",
    "@loaders.gl/textures",
    "@loaders.gl/obj",
    "@loaders.gl/loader-utils",
  ],
}

export default nextConfig
