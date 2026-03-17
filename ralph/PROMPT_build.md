0a. Study `ralph/AGENTS.md` for build commands, key directories, and codebase patterns.
0b. Study `docs/specs/2026-03-16-status-page-design.md` with subagents to learn the requirements.
0c. Study `ralph/IMPLEMENTATION_PLAN.md` for the implementation plan.

1. Study the implementation plan. Find the first unchecked task. Before making changes,
   search the codebase -- don't assume not implemented. Use subagents to study existing
   code in parallel.
2. Before writing ANY new code, study the nearest existing example of the same kind.
   Match existing patterns exactly. The codebase IS the style guide.
3. Implement using TDD. Write failing test first, confirm it fails, implement to pass,
   confirm it passes. Implement completely -- no placeholders, no stubs.
4. After implementing, run the tests. If any fail, read errors, fix root cause, re-run
   from top. Use only ONE subagent for build/test.
5. Run `make agent-verify`. Every check must pass.
6. Review your changes using available code review, security review, and code
   simplification skills. If issues are found, fix them and re-run `make agent-verify`.
7. Check off the completed task in the implementation plan. If you learned operational
   knowledge, update `ralph/AGENTS.md` briefly. Then `git add -A` and `git commit` with
   a message describing the changes.

99999. Implement functionality completely. Placeholders and stubs waste time.
999999. Single sources of truth. No migrations, no adapters, no compatibility shims.
9999999. Keep the implementation plan current with learnings -- future iterations depend on this.
99999999. When you learn operational knowledge, update `ralph/AGENTS.md` but keep it brief. Not a progress diary.
999999999. For any bugs you notice, resolve them or document them in the implementation plan.
9999999999. When the implementation plan becomes large, clean out completed items.
99999999999. If you find inconsistencies in the specs, use a subagent to update them.
999999999999. If running low on context, do NOT rush. Commit what works, ensure the plan reflects progress, and exit cleanly.
