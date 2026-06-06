/**
 * Type shim for `@hugeicons/core-free-icons`.
 *
 * The package ships correct declarations, but its `typesVersions` map
 * (`"*": ["./dist/types/*"]`) double-applies to the already-resolved `typings`
 * path under this project's `moduleResolution: "node"` (node10), producing a
 * bogus `dist/types/dist/types/index.d.ts` lookup and a TS2307 error. The
 * package resolves fine at runtime (Next.js/webpack honour the `exports` map),
 * and would type-check fine under `node16`/`bundler` resolution — but we don't
 * want to flip the whole project's resolution mode for one dependency.
 *
 * This ambient declaration types just the icons the adapter
 * (`src/components/icons/hugeicons.tsx`) imports. Each icon is an
 * `IconSvgElement` consumed by `<HugeiconsIcon icon={...} />`. If you import
 * additional Hugeicons elsewhere, add their names here.
 */
declare module "@hugeicons/core-free-icons" {
  import type { IconSvgElement } from "@hugeicons/react"

  export const Home01Icon: IconSvgElement
  export const UserMultipleIcon: IconSvgElement
  export const Analytics01Icon: IconSvgElement
  export const Search01Icon: IconSvgElement
  export const Briefcase01Icon: IconSvgElement
  export const Database01Icon: IconSvgElement
  export const Shield01Icon: IconSvgElement
  export const HelpCircleIcon: IconSvgElement
  export const Calendar03Icon: IconSvgElement
  export const Wallet01Icon: IconSvgElement
  export const ArrowRight01Icon: IconSvgElement
  export const PlusSignIcon: IconSvgElement
  export const FolderAddIcon: IconSvgElement
  export const FlashIcon: IconSvgElement
  export const Upload04Icon: IconSvgElement
  export const ArrowDown01Icon: IconSvgElement
  export const KanbanIcon: IconSvgElement
  export const DashboardSquare01Icon: IconSvgElement
  export const CheckListIcon: IconSvgElement
  export const ChartDecreaseIcon: IconSvgElement
  export const ArrowLeft01Icon: IconSvgElement
  export const Location01Icon: IconSvgElement
  export const CheckmarkBadge01Icon: IconSvgElement
  export const Calendar01Icon: IconSvgElement
  export const LinkSquare02Icon: IconSvgElement
  export const Logout03Icon: IconSvgElement
  export const Login03Icon: IconSvgElement
  export const UserAdd01Icon: IconSvgElement
  export const Settings01Icon: IconSvgElement
  export const Message01Icon: IconSvgElement
  export const ViewIcon: IconSvgElement
  export const Share08Icon: IconSvgElement
  export const InformationCircleIcon: IconSvgElement
  export const Notification03Icon: IconSvgElement
  export const Bookmark01Icon: IconSvgElement
  export const Cancel01Icon: IconSvgElement
  export const Loading03Icon: IconSvgElement
  export const Tick02Icon: IconSvgElement
  export const Task01Icon: IconSvgElement
  export const Alert02Icon: IconSvgElement
  export const CheckmarkCircle02Icon: IconSvgElement
  export const ArrowDataTransferHorizontalIcon: IconSvgElement
  export const Download04Icon: IconSvgElement
}
