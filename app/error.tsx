"use client";

import { useEffect } from "react";
import { ErrorDetails } from "@/components/error-details";

export default function ErrorPage({
  error
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const displayError =
    error.digest && !error.message.includes(error.digest)
      ? new Error(`${error.message}（错误编号：${error.digest}）`)
      : error;

  return <ErrorDetails error={displayError} />;
}
