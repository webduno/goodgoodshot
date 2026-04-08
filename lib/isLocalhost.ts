/** True for typical dev hosts (IPv4/IPv6 loopback and hostname `localhost`). */
export function isLocalhostHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}
