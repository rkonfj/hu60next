import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHu60UpstreamHeaders } from "@/lib/hu60-headers";

const API_BASE =
  process.env.HU60_API_BASE?.replace(/\/+$/, "") ?? "https://hu60.cn/q.php";

type UploadForm = {
  requestUrl?: string;
  method?: string;
  enctype?: string;
  fileFieldName?: string;
  formData?: Record<string, string>;
  fileExists?: boolean;
  downloadUrl?: string;
  contentUbb?: string;
  error?: string | boolean;
  notice?: string;
};

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sid = cookieStore.get("hulvlin_sid")?.value;

  if (!sid) {
    return NextResponse.json(
      { success: false, notice: "请先登录后再添加附件。" },
      { status: 401 }
    );
  }

  let input: { name?: unknown; size?: unknown; md5?: unknown };
  try {
    input = (await request.json()) as typeof input;
  } catch {
    return NextResponse.json(
      { success: false, notice: "附件信息无效。" },
      { status: 400 }
    );
  }

  const name = String(input.name ?? "").trim();
  const size = Number(input.size);
  const md5 = String(input.md5 ?? "").toLowerCase();

  if (
    !name ||
    name.length > 255 ||
    !Number.isSafeInteger(size) ||
    size < 0 ||
    !/^[a-f0-9]{32}$/.test(md5)
  ) {
    return NextResponse.json(
      { success: false, notice: "附件名称、大小或校验值无效。" },
      { status: 400 }
    );
  }

  try {
    const { headers } = createHu60UpstreamHeaders(request.headers, {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      "user-agent": "Hulvlin-Next/0.1",
      "x-sid": sid
    });
    const upstream = await fetch(`${API_BASE}/api.upload-form.json`, {
      method: "POST",
      headers,
      body: new URLSearchParams({
        name,
        size: String(size),
        md5
      }),
      cache: "no-store"
    });
    const data = (await upstream.json()) as UploadForm;

    if (
      !upstream.ok ||
      data.error ||
      (data.fileExists !== true && (!data.requestUrl || !data.formData)) ||
      !data.downloadUrl ||
      !data.contentUbb
    ) {
      return NextResponse.json(
        {
          success: false,
          notice: data.notice || "暂时无法获取附件上传凭证。"
        },
        { status: upstream.ok ? 400 : upstream.status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        requestUrl: data.requestUrl,
        method: data.method || "POST",
        fileFieldName: data.fileFieldName || "file",
        formData: data.formData,
        fileExists: data.fileExists === true,
        downloadUrl: data.downloadUrl,
        contentUbb: data.contentUbb
      },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch {
    return NextResponse.json(
      { success: false, notice: "暂时无法连接附件服务。" },
      { status: 502 }
    );
  }
}
