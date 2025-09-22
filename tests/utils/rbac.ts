export function withRole(headers: Record<string, string> = {}, role: 'expo' | 'manager' | 'staff') {
  return { ...headers, 'x-test-role': role }
}