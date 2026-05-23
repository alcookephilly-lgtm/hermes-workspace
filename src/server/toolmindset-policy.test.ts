import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  TOOLMINDSET_POLICY_MAX_CHARS,
  applyToolmindsetPolicy,
  loadToolmindsetPolicy,
} from './toolmindset-policy'

const originalPolicyFile = process.env.WORKSPACE_TOOLMINDSET_POLICY_FILE

afterEach(() => {
  if (originalPolicyFile === undefined) {
    delete process.env.WORKSPACE_TOOLMINDSET_POLICY_FILE
  } else {
    process.env.WORKSPACE_TOOLMINDSET_POLICY_FILE = originalPolicyFile
  }
})

describe('loadToolmindsetPolicy', () => {
  it('loads policy from WORKSPACE_TOOLMINDSET_POLICY_FILE', () => {
    const dir = mkdtempSync(join(tmpdir(), 'workspace-toolmindset-'))
    try {
      const policyFile = join(dir, 'policy.md')
      writeFileSync(policyFile, 'custom wrapper policy', 'utf8')
      process.env.WORKSPACE_TOOLMINDSET_POLICY_FILE = policyFile

      expect(loadToolmindsetPolicy()).toBe('custom wrapper policy')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('falls back to the repo policy file', () => {
    delete process.env.WORKSPACE_TOOLMINDSET_POLICY_FILE

    const policy = loadToolmindsetPolicy()

    expect(policy).toContain('cli-anything-smart-read-mcp')
    expect(policy).toContain('cli-anything-jcodemunch-mcp')
    expect(policy).toContain('cli-anything-jdocmunch-mcp')
  })

  it('caps large policy files to prevent prompt bloat', () => {
    const dir = mkdtempSync(join(tmpdir(), 'workspace-toolmindset-'))
    try {
      const policyFile = join(dir, 'policy.md')
      writeFileSync(policyFile, 'x'.repeat(TOOLMINDSET_POLICY_MAX_CHARS + 100), 'utf8')
      process.env.WORKSPACE_TOOLMINDSET_POLICY_FILE = policyFile

      expect(loadToolmindsetPolicy()).toHaveLength(TOOLMINDSET_POLICY_MAX_CHARS)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('fails open when the policy file is missing', () => {
    process.env.WORKSPACE_TOOLMINDSET_POLICY_FILE = '/tmp/does-not-exist-workspace-toolmindset.md'

    expect(loadToolmindsetPolicy()).toBe('')
  })
})

describe('applyToolmindsetPolicy', () => {
  it('injects the policy after workspace context and before user content', () => {
    const message = '<workspace_context active="true" name="Home" path="/repo" />\n\nInspect src/main.ts'

    expect(applyToolmindsetPolicy(message, 'use smart-read first')).toBe(
      '<workspace_context active="true" name="Home" path="/repo" />\n\n<workspace_toolmindset_policy>\nuse smart-read first\n</workspace_toolmindset_policy>\n\nInspect src/main.ts',
    )
  })

  it('does not inject the policy twice', () => {
    const message = '<workspace_context active="true" name="Home" path="/repo" />\n\n<workspace_toolmindset_policy>\nold\n</workspace_toolmindset_policy>\n\nInspect src/main.ts'

    expect(applyToolmindsetPolicy(message, 'new')).toBe(message)
  })

  it('returns the original message when policy is empty', () => {
    expect(applyToolmindsetPolicy('Inspect src/main.ts', '')).toBe('Inspect src/main.ts')
  })
})
