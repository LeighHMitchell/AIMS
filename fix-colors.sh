#!/bin/bash
# Script to fix hardcoded slate/gray colors in page files

FILES=(
  "frontend/src/app/faq/page.tsx"
  "frontend/src/app/partners/groups/page.tsx"
  "frontend/src/app/admin/page.tsx"
  "frontend/src/app/dashboard/page.tsx"
  "frontend/src/app/login/page.tsx"
  "frontend/src/app/coordination/page.tsx"
  "frontend/src/app/iati/page.tsx"
  "frontend/src/app/analytics/sectors/page.tsx"
  "frontend/src/app/budgets/page.tsx"
  "frontend/src/app/policy-markers/page.tsx"
  "frontend/src/app/demo/improved-sectors/page.tsx"
  "frontend/src/app/demo/action-menu/page.tsx"
  "frontend/src/app/transactions/page.tsx"
  "frontend/src/app/activities/[id]/sectors/page.tsx"
  "frontend/src/app/reports/page.tsx"
  "frontend/src/app/build-history/page.tsx"
  "frontend/src/app/data-clinic/page.tsx"
  "frontend/src/app/library/page.tsx"
  "frontend/src/app/planned-disbursements/page.tsx"
  "frontend/src/app/search/page.tsx"
  "frontend/src/app/sdg-demo/page.tsx"
  "frontend/src/app/sdgs/page.tsx"
  "frontend/src/app/demo/activity-budgets/page.tsx"
  "frontend/src/app/activity-logs/page.tsx"
  "frontend/src/app/iati-import-enhanced/page.tsx"
  "frontend/src/app/partners/groups/new/page.tsx"
  "frontend/src/app/admin/users/page.tsx"
  "frontend/src/app/data-clinic/financial-completeness/page.tsx"
  "frontend/src/app/test-feedback-upload/page.tsx"
  "frontend/src/app/auth/callback/page.tsx"
  "frontend/src/app/auth/auth-code-error/page.tsx"
  "frontend/src/app/debug-sectors/page.tsx"
  "frontend/src/app/test-feedback-debug/page.tsx"
  "frontend/src/app/demo/transaction-grouping/page.tsx"
  "frontend/src/app/demo/iati-import/page.tsx"
  "frontend/src/app/partner-summary/page.tsx"
  "frontend/src/app/profile/page.tsx"
  "frontend/src/app/test-email-change/page.tsx"
  "frontend/src/app/aid-flow-map/page.tsx"
  "frontend/src/app/atlas/page.tsx"
  "frontend/src/app/global-error.tsx"
  "frontend/src/app/demo/skeleton/page.tsx"
  "frontend/src/app/demo/skeletons/page.tsx"
  "frontend/src/app/demo/status-icons/page.tsx"
  "frontend/src/app/activities/page.original.tsx"
)

cd /Users/leighmitchell/aims_project

for f in "${FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "SKIP (not found): $f"
    continue
  fi

  echo "Processing: $f"

  # 1. divide classes
  sed -i '' 's/divide-slate-200/divide-border/g' "$f"
  sed -i '' 's/divide-slate-100/divide-border/g' "$f"
  sed -i '' 's/divide-gray-200/divide-border/g' "$f"
  sed -i '' 's/divide-gray-100/divide-border/g' "$f"

  # 2. border-b
  sed -i '' 's/border-b border-slate-200/border-b border-border/g' "$f"
  sed -i '' 's/border-b border-slate-100/border-b border-border/g' "$f"
  sed -i '' 's/border-b border-gray-200/border-b border-border/g' "$f"

  # 3. border-t
  sed -i '' 's/border-t border-slate-200/border-t border-border/g' "$f"
  sed -i '' 's/border-t border-gray-200/border-t border-border/g' "$f"

  # 16. bg-slate-600 hover:bg-slate-700 (before individual bg-slate replacements)
  sed -i '' 's/bg-slate-600 hover:bg-slate-700/bg-primary hover:bg-primary\/90/g' "$f"

  # 4. hover:bg
  sed -i '' 's/hover:bg-slate-50/hover:bg-muted\/50/g' "$f"
  sed -i '' 's/hover:bg-gray-50/hover:bg-muted\/50/g' "$f"
  sed -i '' 's/hover:bg-slate-100/hover:bg-muted/g' "$f"
  sed -i '' 's/hover:bg-slate-200/hover:bg-muted/g' "$f"
  sed -i '' 's/hover:bg-gray-100/hover:bg-muted/g' "$f"
  sed -i '' 's/hover:bg-gray-200/hover:bg-muted/g' "$f"

  # 5. hover:text
  sed -i '' 's/hover:text-slate-900/hover:text-foreground/g' "$f"
  sed -i '' 's/hover:text-slate-700/hover:text-foreground/g' "$f"
  sed -i '' 's/hover:text-gray-600/hover:text-foreground/g' "$f"
  sed -i '' 's/hover:text-gray-900/hover:text-foreground/g' "$f"

  # 6. text-slate (order matters: longer patterns first)
  sed -i '' 's/text-slate-900/text-foreground/g' "$f"
  sed -i '' 's/text-slate-800/text-foreground/g' "$f"
  sed -i '' 's/text-slate-700/text-foreground/g' "$f"

  # 7. text-slate muted
  sed -i '' 's/text-slate-600/text-muted-foreground/g' "$f"
  sed -i '' 's/text-slate-500/text-muted-foreground/g' "$f"
  sed -i '' 's/text-slate-400/text-muted-foreground/g' "$f"
  sed -i '' 's/text-slate-300/text-muted-foreground/g' "$f"

  # 8. text-gray foreground
  sed -i '' 's/text-gray-900/text-foreground/g' "$f"
  sed -i '' 's/text-gray-800/text-foreground/g' "$f"
  sed -i '' 's/text-gray-700/text-foreground/g' "$f"

  # 9. text-gray muted
  sed -i '' 's/text-gray-600/text-muted-foreground/g' "$f"
  sed -i '' 's/text-gray-500/text-muted-foreground/g' "$f"
  sed -i '' 's/text-gray-400/text-muted-foreground/g' "$f"
  sed -i '' 's/text-gray-300/text-muted-foreground/g' "$f"

  # 10. border-slate
  sed -i '' 's/border-slate-300/border-border/g' "$f"
  sed -i '' 's/border-slate-200/border-border/g' "$f"
  sed -i '' 's/border-slate-100/border-border/g' "$f"

  # 11. border-gray
  sed -i '' 's/border-gray-300/border-border/g' "$f"
  sed -i '' 's/border-gray-200/border-border/g' "$f"
  sed -i '' 's/border-gray-100/border-border/g' "$f"

  # 12. bg-slate
  sed -i '' 's/bg-slate-200/bg-muted/g' "$f"
  sed -i '' 's/bg-slate-100/bg-muted/g' "$f"
  sed -i '' 's/bg-slate-50/bg-muted/g' "$f"

  # 13. bg-gray
  sed -i '' 's/bg-gray-200/bg-muted/g' "$f"
  sed -i '' 's/bg-gray-100/bg-muted/g' "$f"
  sed -i '' 's/bg-gray-50/bg-muted/g' "$f"

  # 14. bg-white
  sed -i '' 's/bg-white/bg-card/g' "$f"

  # 15. hover:bg-gray-800
  sed -i '' 's/hover:bg-gray-800/hover:bg-primary\/90/g' "$f"

  # 17. bg-slate-900
  sed -i '' 's/bg-slate-900/bg-foreground/g' "$f"

done

echo "Done!"
