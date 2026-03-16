import { format, type Locale } from "date-fns";

export function toValidDate(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateValue(
  value: string | Date | null | undefined,
  pattern: string,
  options?: { locale?: Locale; fallback?: string },
) {
  const date = toValidDate(value);
  if (!date) {
    return options?.fallback ?? "-";
  }

  return format(date, pattern, { locale: options?.locale });
}

export function toDateTimeLocalInput(value: string | Date | null | undefined) {
  const date = toValidDate(value);
  if (!date) {
    return "";
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function toDateInput(value: string | Date | null | undefined) {
  const date = toValidDate(value);
  if (!date) {
    return "";
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

export function toIsoDateTime(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  const localDate = new Date(value);
  if (Number.isNaN(localDate.getTime())) {
    return undefined;
  }

  return localDate.toISOString();
}

export function toIsoDate(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  const localDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(localDate.getTime())) {
    return undefined;
  }

  return localDate.toISOString();
}
