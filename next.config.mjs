/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["localhost:*", "10.0.0.19:*", "10.0.0.10:*"],
};

export default nextConfig;
