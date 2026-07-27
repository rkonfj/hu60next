import { avatarUrl } from "@/lib/avatar";

export function Avatar({
  src,
  name,
  size = "md"
}: {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const normalized = avatarUrl(src);
  const letter = (name?.trim() || "虎").slice(0, 1).toUpperCase();

  return (
    <span className={`avatar avatar-${size}`} aria-hidden="true">
      {normalized ? (
        // External avatars have inconsistent dimensions and are intentionally
        // rendered as regular images with a CSS crop.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={normalized} alt="" loading="lazy" />
      ) : (
        <span>{letter}</span>
      )}
    </span>
  );
}
