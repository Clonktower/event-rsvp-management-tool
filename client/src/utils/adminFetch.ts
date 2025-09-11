export async function adminFetch(input: RequestInfo, init: RequestInit = {}) {
  const credentials = localStorage.getItem("credentials");
  const headers = new Headers(init.headers || {});
  if (credentials) {
    headers.set("Authorization", `Basic ${credentials}`);
  }
  return fetch(input, { ...init, headers });
}
