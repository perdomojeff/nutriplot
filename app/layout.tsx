import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'NutriPlot', template: '%s · NutriPlot' },
  description: 'Control de peso y hábitos para cada miembro de la familia.',
  applicationName: 'NutriPlot',
  appleWebApp: { capable: true, title: 'NutriPlot', statusBarStyle: 'default' },
};
export const viewport: Viewport = { themeColor: '#059669', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700&display=swap" />
      </head>
      <body className="bg-verde-50 font-sans text-gray-900 antialiased">{children}</body>
    </html>
  );
}
