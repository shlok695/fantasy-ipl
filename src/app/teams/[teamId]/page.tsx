import { TeamDetailClientPage } from "./team-detail-client-page";

export default async function TeamDetailPage(props: PageProps<"/teams/[teamId]">) {
  const { teamId } = await props.params;
  return <TeamDetailClientPage teamId={teamId} />;
}

