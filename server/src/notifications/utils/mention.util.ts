export type MentionMember = {
  userId: string;
  email: string;
  name: string;
};

export function extractMentionHandles(body: string): string[] {
  const handles = new Set<string>();

  for (const match of body.matchAll(/@([a-zA-Z0-9._-]+)/g)) {
    handles.add(match[1].toLowerCase());
  }

  return [...handles];
}

export function resolveMentionedUserIds(
  handles: string[],
  members: MentionMember[],
  excludeUserId?: string,
): string[] {
  if (handles.length === 0) {
    return [];
  }

  const handleSet = new Set(handles.map((handle) => handle.toLowerCase()));
  const matchedUserIds = new Set<string>();

  for (const member of members) {
    if (excludeUserId && member.userId === excludeUserId) {
      continue;
    }

    const emailLocalPart = member.email.split('@')[0]?.toLowerCase() ?? '';
    const normalizedName = member.name.trim().toLowerCase().replace(/\s+/g, '');

    if (handleSet.has(emailLocalPart) || handleSet.has(normalizedName)) {
      matchedUserIds.add(member.userId);
    }
  }

  return [...matchedUserIds];
}
