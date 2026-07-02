import { ClientCatchAllShell } from '@/components/content/ClientCatchAllShell'
import { SsrCatchAllPage } from './SsrCatchAllPage'

const SERVER_RELAY_FETCH = process.env.NEXT_PUBLIC_SERVER_RELAY_FETCH === '1'

interface PageProps {
  params: Promise<{ slug?: string | string[] }>
}

export default async function CatchAllPage ({ params }: PageProps) {
  if (!SERVER_RELAY_FETCH) {
    return <ClientCatchAllShell />
  }
  return <SsrCatchAllPage params={params} />
}
