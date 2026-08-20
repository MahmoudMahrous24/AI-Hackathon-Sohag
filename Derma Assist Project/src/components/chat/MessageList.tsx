import { useEffect, useRef } from 'react'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import type { Message, BookReference } from '../../types/chat'

interface MessageListProps {
  messages: Message[]
  isTyping: boolean
  typingKind: 'text' | 'image' | 'voice' | 'video'
  onOpenBookReference?: (ref: BookReference) => void
}

export function MessageList({ messages, isTyping, typingKind, onOpenBookReference }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isTyping])

  return (
    <div className="space-y-4" aria-live="polite" aria-relevant="additions">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} onOpenBookReference={onOpenBookReference} />
      ))}
      {isTyping && <TypingIndicator kind={typingKind} />}
      <div ref={endRef} />
    </div>
  )
}
