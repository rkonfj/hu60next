export function formatAtTaMention(author: string) {
  return `@${author}，`;
}

export function resolveAtTaAuthor(trigger: HTMLElement) {
  const fromData = trigger.dataset.atAuthor?.trim();
  if (fromData) return fromData;

  if (!trigger.classList.contains("userat")) return "";

  const sibling = trigger.nextElementSibling;
  if (
    sibling instanceof HTMLElement &&
    sibling.classList.contains("userinfo")
  ) {
    return sibling.textContent?.trim() ?? "";
  }

  return "";
}

export function topicAuthorName(name: string | null | undefined, uid: number) {
  return name?.trim() || `用户 ${uid}`;
}
