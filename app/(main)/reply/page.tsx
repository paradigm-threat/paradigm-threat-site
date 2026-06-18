'use client'

import { notFound } from 'next/navigation'
import { ReplyAssistant } from '@/components/ReplyAssistant/ReplyAssistant'
import { isReplyAssistantFeatureEnabled } from '@/lib/siteOpsFeature'

export default function ReplyPage () {
  if (!isReplyAssistantFeatureEnabled()) {
    notFound()
  }
  return <ReplyAssistant />
}
