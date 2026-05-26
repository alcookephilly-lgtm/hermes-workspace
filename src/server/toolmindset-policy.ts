import {
  existsSync,
  openSync,
  readSync,
  closeSync,
  statSync,
} from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'

export const TOOLMINDSET_POLICY_MAX_BYTES = 4096
export const TOOLMINDSET_POLICY_TAG = 'workspace_toolmindset_policy'
const TOOLMINDSET_POLICY_READ_BYTES = TOOLMINDSET_POLICY_MAX_BYTES * 2

function isRegularFile(path: string): boolean {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

function findWorkspaceRoot(): string {
  const envRoot = process.env.WORKSPACE_ROOT?.trim()
  const candidates = [envRoot, process.cwd()]
    .filter((candidate): candidate is string => Boolean(candidate))
    .map((candidate) => resolve(candidate))

  for (const start of candidates) {
    let current = start
    for (;;) {
      const packageFile = join(current, 'package.json')
      if (existsSync(packageFile) && isRegularFile(packageFile)) {
        try {
          const pkg = JSON.parse(readPolicyFile(packageFile, 16_384)) as {
            name?: unknown
          }
          if (pkg.name === 'hermes-workspace') return current
        } catch {
          // keep walking
        }
      }
      const parent = dirname(current)
      if (parent === current) break
      current = parent
    }
  }

  return process.cwd()
}

function trimToByteCap(value: string, maxBytes: number): string {
  let trimmed = value.trim()
  while (Buffer.byteLength(trimmed, 'utf8') > maxBytes) {
    trimmed = trimmed.slice(0, Math.max(0, trimmed.length - 1)).trimEnd()
  }
  return trimmed
}

function readPolicyFile(path: string, maxBytes = TOOLMINDSET_POLICY_READ_BYTES): string {
  if (!path || !isRegularFile(path)) return ''

  let fd: number | null = null
  try {
    fd = openSync(path, 'r')
    const buffer = Buffer.alloc(maxBytes)
    const bytesRead = readSync(fd, buffer, 0, maxBytes, 0)
    return buffer.subarray(0, bytesRead).toString('utf8')
  } catch {
    return ''
  } finally {
    if (fd !== null) {
      try {
        closeSync(fd)
      } catch {
        // ignore
      }
    }
  }
}

function resolvePolicyCandidates(): string[] {
  const workspaceRoot = findWorkspaceRoot()
  const envPath = process.env.WORKSPACE_TOOLMINDSET_POLICY_FILE?.trim()
  const candidates: string[] = []

  if (envPath && isAbsolute(envPath)) {
    const resolvedEnvPath = resolve(envPath)
    const policyDir = resolve(workspaceRoot, 'policies')
    if (
      resolvedEnvPath === policyDir ||
      resolvedEnvPath.startsWith(`${policyDir}/`)
    ) {
      candidates.push(resolvedEnvPath)
    }
  }

  candidates.push(resolve(workspaceRoot, 'policies/hermes-toolmindset-directive.md'))
  return candidates
}

export function loadToolmindsetPolicy(): string {
  for (const candidate of resolvePolicyCandidates()) {
    const policy = readPolicyFile(candidate)
    if (policy) return trimToByteCap(policy, TOOLMINDSET_POLICY_MAX_BYTES)
  }

  return ''
}

function stripUserSuppliedPolicyBlocks(message: string): string {
  return message
    .replace(
      new RegExp(`<${TOOLMINDSET_POLICY_TAG}>[\\s\\S]*?</${TOOLMINDSET_POLICY_TAG}>`, 'gi'),
      '',
    )
    .trimStart()
}

export function formatToolmindsetPolicy(policy: string): string {
  const trimmedPolicy = policy.trim()
  if (!trimmedPolicy) return ''
  return `<${TOOLMINDSET_POLICY_TAG}>\n${trimmedPolicy}\n</${TOOLMINDSET_POLICY_TAG}>`
}

export function applyToolmindsetPolicy(message: string, policy: string): string {
  const policyBlock = formatToolmindsetPolicy(policy)
  if (!policyBlock) return message

  const sanitizedMessage = stripUserSuppliedPolicyBlocks(message)
  const workspaceContextMatch = sanitizedMessage.match(
    /^(\s*<workspace_context\s+active="true"[^>]*\/?>\s*)/i,
  )

  if (!workspaceContextMatch) {
    return `${policyBlock}\n\n${sanitizedMessage}`
  }

  const contextBlock = workspaceContextMatch[1].trimEnd()
  const userContent = sanitizedMessage
    .slice(workspaceContextMatch[0].length)
    .trimStart()
  return `${contextBlock}\n\n${policyBlock}\n\n${userContent}`
}
