import { redirect } from "next/navigation";

// Legacy partner profile route — superseded by the organisation profile.
export default function LegacyPartnerProfilePage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/organizations/${params.id}`);
}
