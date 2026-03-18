export function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export function pageItems<T>(page: Page<T> | null | undefined): T[] {
  return ensureArray(page?.items);
}
