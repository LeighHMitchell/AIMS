"use client"

/**
 * Hugeicons adapter for the app chrome (left sidebar + top nav).
 *
 * Lucide and Hugeicons have different APIs: Lucide exports one component per
 * icon (`<Search className="h-4 w-4" />`), while Hugeicons uses a single
 * renderer fed an icon object (`<HugeiconsIcon icon={Search01Icon} />`).
 *
 * To swap call sites over without rewriting every one, this module re-exports
 * drop-in components under the SAME names the code already imports from
 * "lucide-react". Each accepts the Lucide-style props those call sites use
 * (`className`, `strokeWidth`) and renders the matching Hugeicons glyph.
 * Sizing still comes from Tailwind classes (`h-4 w-4`), which override the
 * SVG's intrinsic size exactly as they did with Lucide.
 *
 * Only icons used by migrated areas are mapped here. To migrate more of the
 * app, add the Lucide name → Hugeicons glyph below (and the corresponding
 * core-free-icons name to src/types/hugeicons-core-free-icons.d.ts).
 */

import React from "react"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  // sidebar
  Home01Icon,
  UserMultipleIcon,
  Analytics01Icon,
  Search01Icon,
  Briefcase01Icon,
  Database01Icon,
  Shield01Icon,
  HelpCircleIcon,
  Calendar03Icon,
  Wallet01Icon,
  ArrowRight01Icon,
  PlusSignIcon,
  FolderAddIcon,
  FlashIcon,
  Upload04Icon,
  ArrowDown01Icon,
  KanbanIcon,
  DashboardSquare01Icon,
  CheckListIcon,
  ChartDecreaseIcon,
  ArrowLeft01Icon,
  Location01Icon,
  CheckmarkBadge01Icon,
  Calendar01Icon,
  LinkSquare02Icon,
  // top nav
  Logout03Icon,
  Login03Icon,
  UserAdd01Icon,
  Settings01Icon,
  Message01Icon,
  ViewIcon,
  Share08Icon,
  InformationCircleIcon,
  Notification03Icon,
  Bookmark01Icon,
  Cancel01Icon,
  Loading03Icon,
  Tick02Icon,
  Task01Icon,
  Alert02Icon,
  CheckmarkCircle02Icon,
  ArrowDataTransferHorizontalIcon,
  Download04Icon,
} from "@hugeicons/core-free-icons"

/**
 * Props a Lucide-style call site may pass. We accept the full set of SVG props
 * (className, style, onClick, aria-*, color, …) plus Lucide's `size`/`strokeWidth`
 * and forward them to HugeiconsIcon, so this is a true drop-in replacement.
 */
type IconProps = Omit<React.ComponentProps<typeof HugeiconsIcon>, "icon">

/** Build a Lucide-shaped component backed by a Hugeicons glyph. */
function makeIcon(icon: IconSvgElement, displayName: string) {
  const Icon = ({ size, ...props }: IconProps) => (
    <HugeiconsIcon
      icon={icon}
      // Let Tailwind h-/w- classes drive the rendered size (as with Lucide);
      // fall back to Hugeicons' 24px default when no size class is supplied.
      size={size ?? 24}
      {...props}
    />
  )
  Icon.displayName = displayName
  return Icon
}

// ─── Lucide name → Hugeicons glyph mapping ───

// Sidebar
export const Home = makeIcon(Home01Icon, "Home")
export const Users = makeIcon(UserMultipleIcon, "Users")
export const BarChart3 = makeIcon(Analytics01Icon, "BarChart3")
export const Search = makeIcon(Search01Icon, "Search")
export const Briefcase = makeIcon(Briefcase01Icon, "Briefcase")
export const Database = makeIcon(Database01Icon, "Database")
export const Shield = makeIcon(Shield01Icon, "Shield")
export const HelpCircle = makeIcon(HelpCircleIcon, "HelpCircle")
export const CalendarClock = makeIcon(Calendar03Icon, "CalendarClock")
export const Wallet = makeIcon(Wallet01Icon, "Wallet")
export const ChevronRight = makeIcon(ArrowRight01Icon, "ChevronRight")
export const Plus = makeIcon(PlusSignIcon, "Plus")
export const FolderPlus = makeIcon(FolderAddIcon, "FolderPlus")
export const Zap = makeIcon(FlashIcon, "Zap")
export const Upload = makeIcon(Upload04Icon, "Upload")
export const ChevronDown = makeIcon(ArrowDown01Icon, "ChevronDown")
export const FolderKanban = makeIcon(KanbanIcon, "FolderKanban")
export const LayoutDashboard = makeIcon(DashboardSquare01Icon, "LayoutDashboard")
export const ListTodo = makeIcon(CheckListIcon, "ListTodo")
export const TrendingDown = makeIcon(ChartDecreaseIcon, "TrendingDown")
export const ArrowLeft = makeIcon(ArrowLeft01Icon, "ArrowLeft")
export const MapPin = makeIcon(Location01Icon, "MapPin")
export const ShieldCheck = makeIcon(CheckmarkBadge01Icon, "ShieldCheck")
export const Calendar = makeIcon(Calendar01Icon, "Calendar")
export const ExternalLink = makeIcon(LinkSquare02Icon, "ExternalLink")

// Top nav
export const LogOut = makeIcon(Logout03Icon, "LogOut")
export const LogIn = makeIcon(Login03Icon, "LogIn")
export const UserPlus = makeIcon(UserAdd01Icon, "UserPlus")
export const Settings = makeIcon(Settings01Icon, "Settings")
export const MessageSquare = makeIcon(Message01Icon, "MessageSquare")
export const Eye = makeIcon(ViewIcon, "Eye")
export const Share = makeIcon(Share08Icon, "Share")
export const Share2 = makeIcon(Share08Icon, "Share2")
export const Info = makeIcon(InformationCircleIcon, "Info")
export const Bell = makeIcon(Notification03Icon, "Bell")
export const Bookmark = makeIcon(Bookmark01Icon, "Bookmark")
export const X = makeIcon(Cancel01Icon, "X")
export const Loader2 = makeIcon(Loading03Icon, "Loader2")
export const Check = makeIcon(Tick02Icon, "Check")
export const ClipboardList = makeIcon(Task01Icon, "ClipboardList")
export const AlertTriangle = makeIcon(Alert02Icon, "AlertTriangle")
export const CheckCircle2 = makeIcon(CheckmarkCircle02Icon, "CheckCircle2")
export const ArrowRightLeft = makeIcon(ArrowDataTransferHorizontalIcon, "ArrowRightLeft")
export const Download = makeIcon(Download04Icon, "Download")
