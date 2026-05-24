import { ChatRoom } from '@client'
import { ChatDisabledNotice } from '@/components/chat/ChatDisabledNotice'
import { isChatDisabled } from '@/lib/siteOpsFeature'

export default function ChatPage () {
  if (isChatDisabled()) {
    return <ChatDisabledNotice />
  }
  return <ChatRoom mode='full' />
}
