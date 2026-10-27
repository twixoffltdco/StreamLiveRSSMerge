export const metadata = {
  title: 'StreamLive RSS Merge',
  description: 'Merged RSS from StreamLive mirrors',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, background: '#0b0b12', color: '#f4f4f8' }}>{children}</body>
    </html>
  );
}
