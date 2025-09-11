export function getUserFromCookie(): { id: string; name: string } | undefined {
  const cookieMatch = document.cookie.match(/user_details=([^;]+)/);
  if (cookieMatch) {
    try {
      return JSON.parse(decodeURIComponent(cookieMatch[1]));
    } catch (err) {
      console.error(err);
    }
  }
  return undefined;
}
