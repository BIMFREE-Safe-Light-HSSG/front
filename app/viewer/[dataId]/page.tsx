import { FacilityPointCloudViewerShell } from "@/components/facility-viewer/FacilityPointCloudViewerShell"
import { parseFacilityDataId } from "@/lib/facility-list-types"

type PageProps = {
  params: Promise<{ dataId: string }>
}

export default async function FacilityViewerDetailPage({ params }: PageProps) {
  const { dataId: raw } = await params
  const dataId = parseFacilityDataId(raw ?? "")

  return <FacilityPointCloudViewerShell dataId={dataId} />
}
