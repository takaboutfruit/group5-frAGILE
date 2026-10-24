export const message = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong. Please try again.";
export const date = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
export const shortId = (id: string) => id.slice(0, 6).toUpperCase();
