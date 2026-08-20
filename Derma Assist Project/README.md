# DermaAssist AI

Production single-page site for an AI dermatology assistant. One conversation timeline, bilingual English / Arabic, dark editorial UI.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- lucide-react
- pnpm

## Scripts

```bash
pnpm install
pnpm dev
pnpm build
```

If `pnpm` is not on your PATH, `npx pnpm install` and `npx pnpm dev` also work.

The language toggle persists in `localStorage` (`dermaassist-lang`). Arabic is the default.
