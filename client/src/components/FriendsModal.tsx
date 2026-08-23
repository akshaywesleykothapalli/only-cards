'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { X, UserPlus, Check, X as XIcon, Search, Users, Gamepad2 } from 'lucide-react';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FriendsModal({ isOpen, onClose }: FriendsModalProps) {
  const { friends, pendingRequests, sendFriendRequest, fetchFriends, fetchPendingRequests, acceptFriendRequest, user, roomState } = useGameStore();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  const [searchUsername, setSearchUsername] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      fetchFriends();
      fetchPendingRequests();
    }
  }, [isOpen, user, fetchFriends, fetchPendingRequests]);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSendingRequest(true);

    try {
      await sendFriendRequest(searchUsername);
      setSuccess(`Friend request sent to ${searchUsername}`);
      setSearchUsername('');
      fetchPendingRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to send friend request');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleAcceptRequest = async (friendId: string) => {
    try {
      await acceptFriendRequest(friendId);
      setSuccess('Friend request accepted');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to accept friend request');
    }
  };

  const handleCopyRoomCode = async () => {
    if (!roomState || roomState.isStarted) return;
    try {
      await navigator.clipboard.writeText(roomState.roomId);
      setSuccess('Room code copied — send it to your friend so they can join.');
    } catch {
      setError('Could not copy the room code. Please share it manually.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.98, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.98, y: 8, opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="relative w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative rounded-3xl bg-white/[0.03] p-5 sm:p-6 border border-white/10 backdrop-blur-sm">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-6 h-6 text-red-400" />
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">FRIENDS</h2>
                </div>
                <p className="text-gray-400 text-sm font-medium">Manage your friends and requests</p>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setActiveTab('friends')}
                  className={`flex-1 py-3 px-4 rounded-xl font-black uppercase tracking-wider text-xs transition-all ${
                    activeTab === 'friends'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  Friends ({friends.length})
                </button>
                <button
                  onClick={() => setActiveTab('requests')}
                  className={`flex-1 py-3 px-4 rounded-xl font-black uppercase tracking-wider text-xs transition-all relative ${
                    activeTab === 'requests'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  Requests
                  {pendingRequests.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-black">
                      {pendingRequests.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Add Friend Form */}
              <form onSubmit={handleSendRequest} className="mb-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <input
                      type="text"
                      value={searchUsername}
                      onChange={(e) => setSearchUsername(e.target.value)}
                      placeholder="Enter username..."
                      className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-medium"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sendingRequest || !searchUsername}
                    className="justify-center px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-wider text-xs rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    {sendingRequest ? 'SENDING...' : 'ADD'}
                  </button>
                </div>
              </form>

              {/* Messages */}
              {error && (
                <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm font-medium">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-green-400 text-sm font-medium">
                  {success}
                </div>
              )}

              {/* Content */}
              <div className="max-h-80 overflow-hidden">
                {activeTab === 'friends' ? (
                  friends.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Gamepad2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="font-semibold">No friends yet</p>
                      <p className="text-sm">Add friends by their username above</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {friends.map((friend: any) => (
                        <motion.div
                          key={friend.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-black">
                            {friend.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="font-black text-white text-sm">{friend.username}</p>
                            <p className="text-xs text-gray-400 font-medium">
                              {(friend.profile?.rankedTier || 'BRONZE_I').replace('_', ' ')} • {friend.profile?.mmr || 1000} Score
                            </p>
                          </div>
                          {roomState && !roomState.isStarted ? (
                            <button onClick={handleCopyRoomCode} className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[10px] font-black tracking-wider text-red-300 transition-colors hover:bg-red-500 hover:text-white">
                              INVITE
                            </button>
                          ) : (
                            <div className="text-xs text-green-400 font-black uppercase tracking-wider">Online</div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )
                ) : (
                  pendingRequests.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <UserPlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="font-semibold">No pending requests</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pendingRequests.map((request: any) => (
                        <div
                          key={request.id}
                          className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-black">
                            {request.user.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="font-black text-white text-sm">{request.user.username}</p>
                            <p className="text-xs text-gray-400 font-medium">Wants to be your friend</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAcceptRequest(request.user.id)}
                              className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-all"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all">
                              <XIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
