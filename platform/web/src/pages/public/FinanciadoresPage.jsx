import CmsPageShell from '../../components/CmsPageShell'
import FinanciadorForm from '../../components/FinanciadorForm'

export default function FinanciadoresPage() {
  return (
    <CmsPageShell slug="financiadores" portalId="to-financiador-form-mount">
      <FinanciadorForm />
    </CmsPageShell>
  )
}
