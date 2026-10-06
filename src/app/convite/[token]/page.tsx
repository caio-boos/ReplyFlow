import AcceptInviteForm from "./AcceptInviteForm";

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <AcceptInviteForm token={token} />;
}
