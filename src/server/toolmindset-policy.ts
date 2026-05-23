import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export const TOOLMINDSET_POLICY_MAX_CHARS = 4096

const defaultPolicyFile = join(process.cwd(), 'policies', 'hermes-toolmindset-directive.md')

function readPolicyFile(path: string): string {
  if (!path || !existsSync(path)) return ''
  try {
    return readFileSync(path, 'utf8').trim().slice(0, TOOLMINDSET_POLICY_MAX_CHARS)
  } catch {
    return ''
  }
}

export function loadToolmindsetPolicy(): string {
  const envPath = process.env.WORKSPACE_TOOLMINDSET_POLICY_FILE?.trim()
  if (envPath) {
    return readPolicyFile(envPath)
  }
  return readPolicyFile(defaultPolicyFile)
}

export function applyToolmindsetPolicy(message: string, policy: string): string {
  const trimmedPolicy = policy.trim()
  if (!trimmedPolicy) return message
  if (message.includes('<workspace_toolmindset_policy>')) return message

  const policyBlock = `<workspace_toolmindset_policy>\n${trimmedPolicy}\n</workspace_toolmindset_policy>`
  const workspaceClose = '/>'
  const workspaceStart = message.indexOf('<workspace_context active="true"')

  if (workspaceStart >= 0) {
    const workspaceEnd = message.indexOf(workspaceClose, workspaceStart)
    if (workspaceEnd >= 0) {
      const insertAt = workspaceEnd + workspaceClose.length
      const before = message.slice(0, insertAt).trimEnd()
      const after = message.slice(insertAt).trimStart()
      return after ? `${before}\n\n${policyBlock}\n\n${after}` : `${before}\n\n${policyBlock}`
    }
  }

  return `${policyBlock}\n\n${message}`
}
