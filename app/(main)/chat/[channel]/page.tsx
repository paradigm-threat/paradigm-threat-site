'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { ChatRoom } from '@client'
import { ChatDisabledNotice } from '@/components/chat/ChatDisabledNotice'
import { isChatDisabled } from '@/lib/siteOpsFeature'

export default function ChatChannelPage() {
    const params = useParams()
    const channel = params?.channel as string | undefined

    if (isChatDisabled()) {
        return <ChatDisabledNotice />
    }

    if (!channel) {
        return null
    }

    return <ChatRoom mode="full" channel={channel} />
}
