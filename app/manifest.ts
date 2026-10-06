import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NutriPlot', short_name: 'NutriPlot', start_url: '/', display: 'standalone',
    background_color: '#F0FDF4', theme_color: '#059669',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
