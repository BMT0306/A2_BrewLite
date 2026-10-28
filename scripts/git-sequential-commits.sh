#!/usr/bin/env bash
set -e

echo "=== GHI NHẬN LỊCH SỬ GIT TUẦN TỰ 5 TASK (BREWLITE ASSIGNMENT 2) ==="

# Task 1: Requirements
echo "[Task 1/5] Committing Requirements (BA deliverables)..."
git add docs/requirements/
git commit -m "docs(task-1): add stakeholder analysis, SRS with MoSCoW, and checkout use-case specification"

# Task 2: System Modeling (Diagrams as code)
echo "[Task 2/5] Committing System Modeling Diagrams & Render Script..."
git add docs/diagrams/ scripts/render-diagrams.mjs
git commit -m "docs(task-2): add end-to-end activity, sequence, and domain class diagrams (.puml and .svg)"

# Task 3: Architecture Design
echo "[Task 3/5] Committing Architecture Design, ADRs and API/UI Specs..."
git add docs/architecture/ docs/database-and-api-design.md docs/ui-ux-frontend-specification.md
git commit -m "docs(task-3): add architecture overview, ADRs, and production UML deployment diagram"

# Task 4: Sprint 1 MVP & CI Pipeline
echo "[Task 4/5] Committing Sprint 1 MVP & CI Workflow..."
git add README.md .gitignore .env.example .github/workflows/ci.yml apps/api/prisma/ apps/api/src/modules/products/ apps/api/src/modules/health/ apps/web/src/app/page.tsx
git commit -m "feat(task-4): setup monorepo, CI pipeline, and Sprint 1 menu viewing MVP"

# Task 5: Sprint 2 Full MVP, CD Pipeline & Traceability
echo "[Task 5/5] Committing Sprint 2 Full MVP, CD Workflow, Tests & Traceability..."
git add .
git commit -m "feat(task-5): complete end-to-end checkout, idempotent payment, tests, CD pipeline, and traceability matrix"

echo "=== HOÀN TẤT TUẦN TỰ 5 COMMITS TRÊN GIT ==="
git log --oneline -n 5
