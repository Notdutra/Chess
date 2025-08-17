---
applyTo: '**'
---

Auto-fix formatting/lint policy

- When a code change produces indentation, Prettier, or ESLint errors that can be automatically fixed, run the project's formatter/linter auto-fix commands instead of making manual whitespace or formatting edits.
- Use the repository's package manager commands (pnpm) from the repository root. Example commands (zsh):

```bash
# Fix files with Prettier
pnpm exec prettier --write <paths>

# Run the linter with auto-fix
pnpm run lint -- --fix

# Optional: run eslint auto-fix across the repo
pnpm exec eslint --ext .js,.ts,.tsx . --fix
```

- After running auto-fix, re-run the project's error/lint checks and continue editing only if checks pass.
- If the execution environment cannot run shell commands, do not perform manual formatting-only edits; instead leave a short note in the change explaining the required auto-fix commands so the developer can run them locally.

This file is a persistent instruction for tooling/agents working in this repository.
---
applyTo: "**"
---

# shadcn/ui LLM UI Development Instructions (2025)

_Last updated: July 2025_

- Always use the fetch tool to look up the latest component usage, install name, and best practices directly from the official shadcn/ui documentation: https://ui.shadcn.com/docs/components
- Do not rely on what you think you know about shadcn/ui components, as they are frequently updated and improved. Your training data is outdated.
- For any shadcn/ui component, CLI command, or usage pattern, fetch the relevant page from the docs and follow the instructions there.

**Core Principles:**

- shadcn/ui components are open code: you are expected to read, modify, and extend them directly.
- Use the CLI (`pnpm dlx shadcn@latest add <component>`) to add or update components.
- Always import from the local `@/components/ui/<component>` path.
- Follow accessibility and composition best practices as described in the docs.

**Summary:**

> For all shadcn/ui work, always use the fetch tool to look up the latest component documentation and usage from https://ui.shadcn.com/docs/components. Do not rely on static instructions.
