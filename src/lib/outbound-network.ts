import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function ipv4IsPublic(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b, c] = octets;
  return !(
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113)
  );
}

function ipv6ToBigInt(address: string): bigint | null {
  const normalized = address.toLowerCase().split("%")[0];
  if (!normalized || normalized.includes(".")) return null;
  const halves = normalized.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null;
  const groups = [...left, ...Array(missing).fill("0"), ...right];
  if (groups.length !== 8 || groups.some((part) => !/^[a-f0-9]{1,4}$/.test(part))) return null;
  let value = BigInt(0);
  for (const part of groups) {
    value = (value * BigInt(65536)) + BigInt(parseInt(part, 16));
  }
  return value;
}

export function isPublicIp(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return ipv4IsPublic(address);
  if (family !== 6) return false;

  const value = ipv6ToBigInt(address);
  if (value === null) return false;

  // Convert IPv4-mapped IPv6 addresses and apply the IPv4 policy.
  if (value / BigInt(2 ** 32) === BigInt(0xffff)) {
    const v4 = Number(value & BigInt(0xffffffff));
    return ipv4IsPublic([v4 >>> 24, (v4 >>> 16) & 255, (v4 >>> 8) & 255, v4 & 255].join("."));
  }

  // Only global unicast (2000::/3), excluding documentation and transition
  // ranges that can tunnel to private IPv4 addresses.
  const globalUnicast = value / BigInt(2 ** 125) === BigInt(1);
  const in2001 = value / BigInt(2 ** 112) === BigInt(0x2001);
  const in2002 = value / BigInt(2 ** 112) === BigInt(0x2002);
  const inDocumentation = value / BigInt(2 ** 96) === BigInt(0x20010db8);
  const inProtocolAssignment = in2001 && ((value / BigInt(2 ** 104)) & BigInt(0xff)) <= BigInt(0x02);
  return globalUnicast && !inDocumentation && !inProtocolAssignment && !in2002;
}

/** Resolve once, reject mixed/private answers, and pin outbound sockets to one public IP. */
export async function resolvePublicAddresses(hostname: string): Promise<string[]> {
  const host = hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
  const family = isIP(host);
  if (family) return isPublicIp(host) ? [host] : [];

  try {
    const answers = await lookup(host, { all: true, verbatim: true });
    if (!answers.length || answers.some(({ address }) => !isPublicIp(address))) return [];
    return answers.map(({ address }) => address);
  } catch {
    return [];
  }
}
