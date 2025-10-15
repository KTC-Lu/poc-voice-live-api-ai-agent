export const metadata = {
  title: 'AI カスタマーサポート - 音声対話システム'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial' }}>
        {children}
      </body>
    </html>
  )
}
