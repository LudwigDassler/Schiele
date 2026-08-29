/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 🔥 ЗАЩИТА ВОРКЕРОВ: Говорим Webpack не трогать Tesseract при сборке
  serverExternalPackages: ["tesseract.js"],
};

module.exports = nextConfig;
