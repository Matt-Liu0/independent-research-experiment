// Before a real launch: fails if any participant-facing text or the interviewer prompts are still
// marked DRAFT, or if the case set T is empty (the case arm would never be assigned).
//
//   npm run check:launch          (npm run build:launch runs it, then the build)
//
// Preview and demo builds (npm run build) don't run it, so drafts can still be shown for review.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { CASE_SET, DOMAINS } from '../functions/src/prompts'

const DRAFT = /isDraft:\s*true|PROMPTS_ARE_DRAFT\s*=\s*true/

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === 'node_modules' || name === 'lib' ? [] : sources(path)
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })
}

const problems: string[] = []
for (const file of [...sources('src'), ...sources('functions/src')]) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (DRAFT.test(line) && !/^\s*(\/\/|\*)/.test(line)) problems.push(`${file}:${i + 1} is still a draft: ${line.trim()}`)
    })
}
for (const d of DOMAINS) if (CASE_SET[d].length === 0) problems.push(`The case set T has no ${d} cases (functions/src/prompts.ts, CASE_SET).`)

if (problems.length) {
  console.error(`Not ready to launch (${problems.length}):\n${problems.map((p) => `  ${p}`).join('\n')}`)
  process.exit(1)
}
console.log('Ready to launch: no drafts left, and the case set T has cases for both domains.')
