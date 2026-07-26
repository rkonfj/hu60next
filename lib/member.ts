export function getMemberTitle(regtime?: number) {
  if (!regtime) return "创世会员";

  const registrationYear = new Date(regtime * 1000).getUTCFullYear();
  if (registrationYear <= 2012) return "传奇会员";
  if (registrationYear <= 2016) return "骨灰会员";
  return "会员";
}
