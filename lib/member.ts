export function getMemberTitle(regtime?: number): string | null {
  if (!regtime) return "创世";

  const registrationYear = new Date(regtime * 1000).getUTCFullYear();
  if (registrationYear <= 2012) return "传奇";
  if (registrationYear <= 2016) return "骨灰";
  return null;
}

// HU60 的 UID 按注册顺序分配：
// 16643 是 2012 年最后一位会员，21696 是 2016 年最后一位会员。
export function getMemberTitleByUid(uid?: number): string | null {
  const safeUid = Math.trunc(Number(uid));
  if (!Number.isFinite(safeUid) || safeUid <= 0) return null;
  if (safeUid <= 16643) return "传奇";
  if (safeUid <= 21696) return "骨灰";
  return null;
}
