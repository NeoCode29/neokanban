'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Users,
  UserPlus,
  Trash2,
  LogOut,
  Loader2,
  Check,
  AlertCircle,
  Shield,
  User,
} from 'lucide-react'

export interface BoardMemberData {
  id: string
  userId: string
  role: string
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    avatarUrl?: string | null
  }
}

export interface BoardOwnerData {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
}

interface ShareBoardModalProps {
  boardId: string
  boardTitle: string
  onClose: () => void
  onMembersChange?: (count: number) => void
}

export default function ShareBoardModal({
  boardId,
  boardTitle,
  onClose,
  onMembersChange,
}: ShareBoardModalProps) {
  const [owner, setOwner] = useState<BoardOwnerData | null>(null)
  const [members, setMembers] = useState<BoardMemberData[]>([])
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const fetchMembers = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/boards/${boardId}/members`)
      if (res.ok) {
        const data = await res.json()
        setOwner(data.owner)
        setMembers(data.members || [])
        setIsOwner(Boolean(data.isOwner))
        if (onMembersChange) {
          onMembersChange((data.members || []).length)
        }
      }
    } catch (err) {
      console.error('Failed to fetch members:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [boardId])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setInviting(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const res = await fetch(`/api/boards/${boardId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccessMsg(`Successfully invited ${data.member.user.name} (${data.member.user.email})`)
        setInviteEmail('')
        setMembers((prev) => [...prev, data.member])
        if (onMembersChange) {
          onMembersChange(members.length + 1)
        }
        setTimeout(() => setSuccessMsg(null), 3000)
      } else {
        setErrorMsg(data.error || 'Failed to invite user')
      }
    } catch (err: any) {
      setErrorMsg('An unexpected error occurred while inviting.')
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this project?`)) return

    setActionLoadingId(memberId)
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/boards/${boardId}/members/${memberId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        const next = members.filter((m) => m.id !== memberId)
        setMembers(next)
        if (onMembersChange) {
          onMembersChange(next.length)
        }
      } else {
        const data = await res.json()
        setErrorMsg(data.error || 'Failed to remove member')
      }
    } catch (err) {
      setErrorMsg('Failed to remove member')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleLeaveBoard = async (memberId: string) => {
    if (!confirm('Are you sure you want to leave this project? You will lose access to its board and context.')) return

    setActionLoadingId(memberId)
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/boards/${boardId}/members/${memberId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        window.location.href = '/'
      } else {
        const data = await res.json()
        setErrorMsg(data.error || 'Failed to leave project')
      }
    } catch (err) {
      setErrorMsg('Failed to leave project')
    } finally {
      setActionLoadingId(null)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || 'U'
  }

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/30 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white border border-neutral-200/90 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 tracking-tight">Share Project</h3>
              <p className="text-[11px] text-neutral-500 truncate max-w-xs">{boardTitle}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5">
          {/* Invite Section: Only Owner can invite */}
          {isOwner ? (
            <form onSubmit={handleInvite} className="space-y-2">
              <label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-neutral-500" />
                <span>Invite Collaborator by Email</span>
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="collaborator@example.com"
                  className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 transition-colors font-mono"
                />
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail.trim()}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 shrink-0"
                >
                  {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  <span>Invite</span>
                </button>
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-red-50/80 border border-red-200/80 text-xs text-red-600 flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-xs text-emerald-700 flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}
            </form>
          ) : (
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 text-xs text-neutral-500 flex items-center gap-2">
              <Shield className="w-4 h-4 text-neutral-400 shrink-0" />
              <span>You are collaborating on this board. Only the owner can invite new members.</span>
            </div>
          )}

          {/* Members Roster */}
          <div className="space-y-2.5 pt-2">
            <h4 className="text-xs font-semibold text-neutral-600 uppercase tracking-wider flex items-center justify-between">
              <span>Project Members</span>
              <span className="text-neutral-400 font-normal">
                {1 + members.length} total
              </span>
            </h4>

            {loading ? (
              <div className="py-8 flex items-center justify-center text-neutral-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-neutral-800" />
                <span className="text-xs">Loading members...</span>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 border border-neutral-100 rounded-xl overflow-hidden bg-neutral-50/30">
                {/* Board Owner Item */}
                {owner && (
                  <div className="p-3 flex items-center justify-between gap-3 bg-white">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0">
                        {getInitials(owner.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-neutral-900 truncate">{owner.name}</p>
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Owner
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 font-mono truncate">{owner.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Collaborators List */}
                {members.map((member) => (
                  <div key={member.id} className="p-3 flex items-center justify-between gap-3 bg-white">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold shrink-0">
                        {getInitials(member.user.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-neutral-900 truncate">{member.user.name}</p>
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                            Collaborator
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 font-mono truncate">{member.user.email}</p>
                      </div>
                    </div>

                    {/* Action button */}
                    <div>
                      {isOwner ? (
                        <button
                          onClick={() => handleRemoveMember(member.id, member.user.name)}
                          disabled={actionLoadingId === member.id}
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Remove collaborator"
                        >
                          {actionLoadingId === member.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      ) : (
                        !isOwner && (
                          <button
                            onClick={() => handleLeaveBoard(member.id)}
                            disabled={actionLoadingId === member.id}
                            className="text-xs text-red-500 hover:text-red-700 hover:underline flex items-center gap-1 disabled:opacity-50"
                          >
                            <LogOut className="w-3 h-3" />
                            <span>Leave</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
