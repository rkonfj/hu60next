import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { CodeCopyEnhancer } from "@/components/code-copy-enhancer";
import { Header } from "@/components/header";
import { NavigationProgress } from "@/components/navigation-progress";
import { WeeklyMvpIdentityStyles } from "@/components/weekly-mvp-identity-styles";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "虎绿林 · 让技术讨论持续生长",
    template: "%s · 虎绿林"
  },
  description:
    "虎绿林现代社区体验：浏览技术讨论、深度教程、软件开发与设备实践。",
  metadataBase: new URL("https://hulvlin-next.openai.site")
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f2" },
    { media: "(prefers-color-scheme: dark)", color: "#101512" }
  ]
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <CodeCopyEnhancer />
        <Suspense fallback={null}>
          <WeeklyMvpIdentityStyles />
        </Suspense>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <Header />
        {children}
        <footer className="site-footer">
          <span>虎绿林</span>
          <span>让技术讨论持续生长</span>
          <nav className="footer-theme-links" aria-label="主题选择">
            <strong>主题</strong>
            <a href="https://hu60.cn/q.php/link.tpl.jhin.html">Jhin</a>
            <a href="https://hu60.cn/q.php/link.tpl.classic.html">经典</a>
          </nav>
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
          >
            京ICP备18041936号-1
          </a>
        </footer>
      </body>
    </html>
  );
}
