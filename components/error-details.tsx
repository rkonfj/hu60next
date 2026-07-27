import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { getPublicErrorDetails } from "@/lib/public-error";

export function ErrorDetails({
  error,
  title = "页面渲染失败"
}: {
  error: unknown;
  title?: string;
}) {
  const details = getPublicErrorDetails(error);

  return (
    <main className="page-shell narrow-page error-details-page">
      <section className="error-details-card">
        <AlertTriangle size={34} aria-hidden="true" />
        <h1>{title}</h1>
        <p>下面是经过脱敏的具体错误，凭据、请求参数和本机路径不会显示。</p>
        <pre>
          <strong>{details.name}</strong>
          {"\n"}
          {details.message}
        </pre>
        <Link href="/explore/active">返回社区首页</Link>
      </section>
    </main>
  );
}
