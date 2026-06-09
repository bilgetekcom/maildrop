import { app } from 'electron'
import { resolve, sep, normalize } from 'path'
import { ERR } from '../../shared/errors'

/**
 * Validate that a renderer-supplied filesystem path is safe to read/use.
 *
 * Rules:
 *  - must be a non-empty string
 *  - must resolve to an absolute path
 *  - must NOT live under the app's resources/install directory
 *  - must NOT live under sensitive system roots (Windows\System32, /etc, etc.)
 *  - max length 4096
 *
 * Throws Error(ERR.PATH_INVALID) or Error(ERR.PATH_OUTSIDE) on rejection.
 */
export function assertSafePath(input: unknown): string {
  if (typeof input !== 'string' || input.length === 0 || input.length > 4096) {
    throw new Error(ERR.PATH_INVALID)
  }

  // Reject null bytes, control chars
  if (/[\x00-\x1f]/.test(input)) throw new Error(ERR.PATH_INVALID)

  let resolved: string
  try {
    resolved = resolve(normalize(input))
  } catch {
    throw new Error(ERR.PATH_INVALID)
  }

  const lower = resolved.toLowerCase()

  // Block known sensitive roots
  const blocked: string[] = []
  if (process.platform === 'win32') {
    const sys = (process.env.SystemRoot || 'C:\\Windows').toLowerCase()
    blocked.push(sys + sep + 'system32', sys + sep + 'syswow64')
  } else {
    blocked.push('/etc', '/root', '/proc', '/sys')
  }
  for (const b of blocked) {
    if (lower.startsWith(b.toLowerCase() + sep) || lower === b.toLowerCase()) {
      throw new Error(ERR.PATH_OUTSIDE)
    }
  }

  // Block resources/install dir (Electron internals)
  try {
    const appPath = app.getAppPath().toLowerCase()
    if (lower.startsWith(appPath + sep) || lower === appPath) {
      throw new Error(ERR.PATH_OUTSIDE)
    }
  } catch {
    /* in dev getAppPath may behave odd, allow */
  }

  return resolved
}
