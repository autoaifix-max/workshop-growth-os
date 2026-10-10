export function redirectIfUnauthorized(...responses: Array<Pick<Response, "status">>): boolean {
  if (!responses.some((response) => response.status === 401)) return false;
  if (typeof window !== "undefined") {
    const next = `${window.location.pathname}${window.location.search}`;
    window.location.assign(`/login?next=${encodeURIComponent(next)}`);
  }
  return true;
}
