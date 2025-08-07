/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  // Only set basePath for production builds (GitHub Pages)
  basePath: process.env.NODE_ENV === 'production' ? '/Chess-game' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/Chess-game/' : '',
  images: {
    unoptimized: true,
  },
  // Ensure static files are properly handled
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(mp3|wav|ogg)$/,
      use: {
        loader: 'file-loader',
        options: {
          publicPath:
            process.env.NODE_ENV === 'production'
              ? '/Chess-game/_next/static/sounds/'
              : '/_next/static/sounds/',
          outputPath: 'static/sounds/',
        },
      },
    });
    return config;
  },
};

export default nextConfig;
