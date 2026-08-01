import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { CodeCopyEnhancer } from "@/components/code-copy-enhancer";
import { ContentImageEnhancer } from "@/components/content-image-enhancer";
import { Header } from "@/components/header";
import { MathContentEnhancer } from "@/components/math-content-enhancer";
import { NavigationProgress } from "@/components/navigation-progress";
import { VoteContentEnhancer } from "@/components/vote-content-enhancer";
import { WeeklyMvpIdentityStyles } from "@/components/weekly-mvp-identity-styles";
import "katex/dist/katex.min.css";
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

function getBuildTime() {
  const value = process.env.NEXT_PUBLIC_BUILD_TIME;
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return {
    iso: date.toISOString(),
    label: new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    })
      .format(date)
      .replaceAll("/", "-")
  };
}

const buildTime = getBuildTime();
const themeInitScript = `
  (() => {
    const root = document.documentElement;
    let mode = "auto";
    try {
      const storedMode = localStorage.getItem("hulvlin-theme");
      if (storedMode === "dark" || storedMode === "light") mode = storedMode;
    } catch {}
    const resolved = mode === "auto"
      ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : mode;
    root.dataset.theme = resolved;
    root.dataset.themeMode = mode;
    root.style.colorScheme = resolved;
  })();
`;

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="zh-CN"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <CodeCopyEnhancer />
        <ContentImageEnhancer />
        <MathContentEnhancer />
        <VoteContentEnhancer />
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
          {buildTime ? (
            <time
              className="footer-build-time"
              dateTime={buildTime.iso}
              title="构建时间（北京时间）"
            >
              构建于 {buildTime.label}
            </time>
          ) : null}
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
