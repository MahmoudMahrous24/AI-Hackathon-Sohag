import { Plus, MessageSquare, Trash2, ChevronRight, ChevronLeft, Clock } from 'lucide-react'
import type { ChatSession } from '../../types/chat'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  chats: ChatSession[]
  activeChatId: string | null
  onSelectChat: (chatId: string) => void
  onNewChat: () => void
  onDeleteChat: (chatId: string) => void
}

export function Sidebar({
  isOpen,
  onToggle,
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
}: SidebarProps) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={`flex flex-col border-e border-border bg-surface-2 transition-all duration-300 z-40 ${
          isOpen ? 'w-64 sm:w-72' : 'w-0 sm:w-14'
        } overflow-hidden shrink-0`}
      >
        {/* Sidebar Header */}
        <div className="flex h-14 items-center justify-between px-3 border-b border-border">
          {isOpen ? (
            <button
              type="button"
              onClick={onNewChat}
              className="flex items-center gap-2 rounded-xl bg-teal px-3 py-2 text-xs font-bold text-canvas hover:bg-teal-dim transition shadow-sm w-full"
            >
              <Plus className="h-4 w-4" />
              <span>محادثة جديدة</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onNewChat}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal text-canvas hover:bg-teal-dim transition mx-auto"
              title="محادثة جديدة"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onToggle}
            className={`rounded-lg p-1.5 text-text-muted hover:bg-surface hover:text-text-primary transition ${
              !isOpen ? 'hidden' : 'ms-2'
            }`}
            title="تصغير القائمة"
          >
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </button>
        </div>

        {/* Chats List */}
        {isOpen ? (
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
              سجل المحادثات السابقة
            </p>

            {chats.length === 0 ? (
              <div className="p-4 text-center text-text-muted text-xs">
                <Clock className="h-6 w-6 mx-auto mb-1 opacity-40" />
                <p>لا توجد محادثات سابقة</p>
              </div>
            ) : (
              chats.map((chat) => {
                const isActive = chat.id === activeChatId
                return (
                  <div
                    key={chat.id}
                    className={`group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition cursor-pointer ${
                      isActive
                        ? 'bg-teal/15 text-teal font-semibold border border-teal/30'
                        : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                    }`}
                    onClick={() => onSelectChat(chat.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{chat.title || 'استشارة سريرية'}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteChat(chat.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-danger rounded transition"
                      title="حذف المحادثة"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center p-2 space-y-2">
            <button
              type="button"
              onClick={onToggle}
              className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-surface transition"
              title="فتح سجل المحادثات"
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
