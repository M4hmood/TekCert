# TekCert handoff

1. Create an empty folder for the code (e.g. `tekcert/`) and copy everything in this folder into it.
2. Open that folder in Claude Code.
3. Paste this as your first message:

> Read CLAUDE.md, PLAN.md and sprints/S00-foundations.md. Do not write any code yet. Write your plan for Sprint 0 in the "Plan" section of S00-foundations.md, list any questions, then stop and wait for my approval.

4. Review the plan, answer the questions, then reply "Approved, build Sprint 0."
5. When Sprint 0 is done and every "Done when" box is ticked, start the next sprint the same way.

## Folder contents
- `CLAUDE.md`: rules Claude Code follows on every turn
- `PLAN.md`: roadmap and backlog
- `sprints/`: one file per sprint
- `docs/decisions.md`: decisions made and still open
- `design/`: the HTML designs. Open `design/Index.dc.html` or `design/Prototype.dc.html` in a browser (serve the folder locally, e.g. `npx serve design`).

Screen file names are in French (e.g. `Tableau-de-bord` = Dashboard); their content is in English.
