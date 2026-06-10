import CmsPageShell from '../../components/CmsPageShell'
import CentralsGrid from '../../components/CentralsGrid'

export default function DeliveryPointsPage() {
  return (
    <CmsPageShell slug="pontos-de-entrega" portalId="to-centrals-mount">
      <CentralsGrid />
    </CmsPageShell>
  )
}
