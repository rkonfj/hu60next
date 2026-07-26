export function getMemberTitle(regtime?: number): string | null {
  if (!regtime) return "创世";

  const registrationYear = new Date(regtime * 1000).getUTCFullYear();
  if (registrationYear <= 2012) return "传奇";
  if (registrationYear <= 2016) return "骨灰";
  return null;
}
