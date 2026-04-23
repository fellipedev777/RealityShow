import '@/styles/globals.css';

export const metadata = {
  title: 'LiveReality - Reality Show Online',
  description: 'Jogue o Big Brother Brasil online em tempo real com seus amigos!',
  icons: { icon: '/favicon.ico' },
  openGraph: {
    title: 'LiveReality',
    description: 'Reality show online e em tempo real',
    type: 'website'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="gradient-bg min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
