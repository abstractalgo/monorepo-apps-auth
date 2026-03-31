export function greet(name: string): string {
  return `Hello, ${name}! Welcome to the monorepo.`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
