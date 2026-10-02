import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageSquare,
  Hash,
  Send,
  Link as LinkIcon,
  CheckSquare,
  Bell,
  BellOff,
  Users,
  Settings,
  Plus,
  Calendar,
  User,
  Check,
  X,
  RefreshCw,
  ChevronDown,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { formatDate, getDisplayName } from '../lib/utils';

const MESSAGE_TYPES = {
  text: { icon: MessageSquare, label: 'Üzenet' },
  link: { icon: LinkIcon, label: 'Link' },
  task: { icon: CheckSquare, label: 'Feladat' },
};

const CHANNEL_TYPE_COLORS = {
  common: 'bg-green-100 text-green-800',
  unit: 'bg-blue-100 text-blue-800',
  events: 'bg-purple-100 text-purple-800',
  leadership: 'bg-red-100 text-red-800',
};

export default function WorkspacePage() {
  const { user, profile, isAdmin } = useAuth();
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [subscription, setSubscription] = useState(null);
  // channelId -> number of unread messages
  const [unreadCounts, setUnreadCounts] = useState({});
  // Timestamp of the user's previous visit, used to draw the "new messages" divider
  const [unreadSince, setUnreadSince] = useState(null);

  // Message input state
  const [messageType, setMessageType] = useState('text');
  const [messageContent, setMessageContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  const messagesEndRef = useRef(null);

  // Fetch channels
  const fetchChannels = useCallback(async () => {
    const { data, error } = await supabase
      .from('workspace_channels')
      .select('*, unit:units(name)')
      .eq('is_active', true)
      .order('channel_type')
      .order('name');

    if (error) {
      console.error('Csatornák betöltési hiba:', error);
    } else if (data) {
      console.log('Csatornák betöltve:', data.length);
      setChannels(data);
      // Select first channel if none selected
      if (!selectedChannel && data.length > 0) {
        setSelectedChannel(data[0]);
      }
    }
  }, [selectedChannel]);

  // Fetch users for mentions and assignees
  const fetchUsers = useCallback(async () => {
    // NOTE: user_profiles has no email column (email lives on auth.users), so
    // selecting it would error out the whole query and leave every author as
    // "Ismeretlen". Only request columns that exist.
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, role');

    const usersMap = {};
    if (error) {
      console.error('Felhasználók betöltési hiba:', error);
    } else if (data) {
      console.log('Felhasználók betöltve:', data.length);
      data.forEach(u => {
        usersMap[u.id] = u;
      });
    }
    // Always include the current user so their own messages resolve to a name
    // even if user_profiles is unavailable (RLS) or has no row for them.
    if (user?.id && !usersMap[user.id]) {
      usersMap[user.id] = {
        id: user.id,
        full_name: profile?.full_name || '',
        email: profile?.email || user.email || '',
      };
    }
    setUsers(usersMap);
  }, [user, profile]);

  // Fetch messages for selected channel
  const fetchMessages = useCallback(async () => {
    if (!selectedChannel) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('workspace_messages')
      .select('*')
      .eq('channel_id', selectedChannel.id)
      .order('created_at', { ascending: true })
      .limit(100);

    if (!error) {
      setMessages(data || []);
    }
    setLoading(false);
  }, [selectedChannel]);

  // Compute unread message counts for every channel the user can see
  const fetchUnreadCounts = useCallback(async (channelList) => {
    if (!user || !channelList?.length) return;

    const { data: subs } = await supabase
      .from('workspace_subscriptions')
      .select('channel_id, last_read_at')
      .eq('user_id', user.id);

    const lastReadByChannel = {};
    (subs || []).forEach((s) => {
      lastReadByChannel[s.channel_id] = s.last_read_at;
    });

    const entries = await Promise.all(
      channelList.map(async (ch) => {
        let query = supabase
          .from('workspace_messages')
          .select('id', { count: 'exact', head: true })
          .eq('channel_id', ch.id)
          .neq('author_id', user.id);

        const lastRead = lastReadByChannel[ch.id];
        if (lastRead) {
          query = query.gt('created_at', lastRead);
        }

        const { count } = await query;
        return [ch.id, count || 0];
      })
    );

    setUnreadCounts(Object.fromEntries(entries));
  }, [user]);

  // Fetch user's subscription for current channel
  const fetchSubscription = useCallback(async () => {
    if (!selectedChannel || !user) return;

    const { data } = await supabase
      .from('workspace_subscriptions')
      .select('*')
      .eq('channel_id', selectedChannel.id)
      .eq('user_id', user.id)
      .maybeSingle();

    // Remember where the user left off so we can mark the first unseen message.
    setUnreadSince(data?.last_read_at || null);

    // Advance last_read_at to now. If there is no subscription row yet, create
    // one — otherwise opening the channel would never clear its unread badge.
    const nowIso = new Date().toISOString();
    if (data) {
      setSubscription(data);
      await supabase
        .from('workspace_subscriptions')
        .update({ last_read_at: nowIso })
        .eq('id', data.id);
    } else {
      const { data: created } = await supabase
        .from('workspace_subscriptions')
        .upsert(
          { channel_id: selectedChannel.id, user_id: user.id, last_read_at: nowIso },
          { onConflict: 'channel_id,user_id' }
        )
        .select()
        .single();
      setSubscription(created || null);
    }

    // Clear the unread badge for this channel once it has been opened.
    setUnreadCounts((prev) => ({ ...prev, [selectedChannel.id]: 0 }));
  }, [selectedChannel, user]);

  // Toggle email notifications
  const toggleNotifications = async () => {
    if (!subscription) return;

    const { error } = await supabase
      .from('workspace_subscriptions')
      .update({ notify_email: !subscription.notify_email })
      .eq('id', subscription.id);

    if (!error) {
      setSubscription({ ...subscription, notify_email: !subscription.notify_email });
    }
  };

  // Send message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!messageContent.trim()) {
      console.error('Üzenet üres');
      return;
    }
    if (!selectedChannel) {
      console.error('Nincs kiválasztott csatorna');
      alert('Hiba: Nincs kiválasztott csatorna. Frissítsd az oldalt.');
      return;
    }

    setSending(true);

    const newMessage = {
      channel_id: selectedChannel.id,
      author_id: user.id,
      content: messageContent.trim(),
      message_type: messageType,
    };

    if (messageType === 'link') {
      newMessage.link_url = linkUrl;
      newMessage.link_title = linkTitle || linkUrl;
    }

    if (messageType === 'task') {
      newMessage.task_assignee_id = taskAssignee || null;
      newMessage.task_deadline = taskDueDate || null;
    }

    const { error } = await supabase
      .from('workspace_messages')
      .insert(newMessage);

    if (error) {
      console.error('Üzenet küldési hiba:', error);
      alert(`Hiba az üzenet küldésekor: ${error.message}`);
    } else {
      // Clear form
      setMessageContent('');
      setLinkUrl('');
      setLinkTitle('');
      setTaskAssignee('');
      setTaskDueDate('');
      setMessageType('text');

      // Refresh messages
      fetchMessages();
    }

    setSending(false);
  };

  // Toggle task completion
  const toggleTaskCompletion = async (message) => {
    const { error } = await supabase
      .from('workspace_messages')
      .update({
        task_completed: !message.task_completed,
        task_completed_at: !message.task_completed ? new Date().toISOString() : null,
        task_completed_by: !message.task_completed ? user.id : null,
      })
      .eq('id', message.id);

    if (!error) {
      fetchMessages();
    }
  };

  // Initial load
  useEffect(() => {
    fetchChannels();
    fetchUsers();
  }, [fetchChannels, fetchUsers]);

  // Recompute unread badges whenever the channel list changes
  useEffect(() => {
    if (channels.length > 0) {
      fetchUnreadCounts(channels);
    }
  }, [channels, fetchUnreadCounts]);

  // Load messages when channel changes
  useEffect(() => {
    if (selectedChannel) {
      fetchMessages();
      fetchSubscription();
    }
  }, [selectedChannel, fetchMessages, fetchSubscription]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-refresh messages every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedChannel) {
        fetchMessages();
      }
      if (channels.length > 0) {
        fetchUnreadCounts(channels);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedChannel, fetchMessages, channels, fetchUnreadCounts]);

  const getUserName = (userId) => {
    return getDisplayName(users[userId]);
  };

  // First message the current user has not seen yet (drives the divider position)
  const firstUnreadMessageId = unreadSince
    ? messages.find(
        (m) =>
          m.author_id !== user.id &&
          new Date(m.created_at) > new Date(unreadSince)
      )?.id
    : null;

  const getChannelIcon = (channel) => {
    if (channel.channel_type === 'leadership') return '👑';
    if (channel.channel_type === 'events') return '🎉';
    if (channel.channel_type === 'unit') return '🏪';
    return '💬';
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="h-7 w-7 text-pepper-red" />
          Pepper Placc
        </h1>
        <p className="text-gray-600 mt-1">
          Belső kommunikáció és feladatok
        </p>
      </div>

      {/* Main content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Channels sidebar */}
        <div className="w-64 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Csatornák
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {channels.map((channel) => {
              const isSelected = selectedChannel?.id === channel.id;
              const unread = unreadCounts[channel.id] || 0;
              const hasUnread = unread > 0 && !isSelected;
              return (
                <button
                  key={channel.id}
                  onClick={() => setSelectedChannel(channel)}
                  className={`w-full text-left px-3 py-2 rounded-lg mb-1 flex items-center gap-2 transition-colors ${
                    isSelected
                      ? 'bg-pepper-red text-white'
                      : hasUnread
                        ? 'hover:bg-gray-100 text-gray-900'
                        : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <span>{getChannelIcon(channel)}</span>
                  <span className={`truncate flex-1 ${hasUnread ? 'font-bold' : ''}`}>
                    {channel.name}
                  </span>
                  {hasUnread && (
                    <span className="ml-auto inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-pepper-red text-white text-xs font-semibold">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col min-w-0">
          {selectedChannel ? (
            <>
              {/* Channel header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <span>{getChannelIcon(selectedChannel)}</span>
                    {selectedChannel.name}
                  </h2>
                  {selectedChannel.description && (
                    <p className="text-sm text-gray-500">{selectedChannel.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleNotifications}
                    className={`p-2 rounded-lg transition-colors ${
                      subscription?.notify_email
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                    title={subscription?.notify_email ? 'Email értesítés bekapcsolva' : 'Email értesítés kikapcsolva'}
                  >
                    {subscription?.notify_email ? (
                      <Bell className="h-4 w-4" />
                    ) : (
                      <BellOff className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={fetchMessages}
                    className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
                    title="Frissítés"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Messages list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                  <div className="text-center text-gray-500 py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Betöltés...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <MessageSquare className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p>Még nincsenek üzenetek ebben a csatornában</p>
                    <p className="text-sm mt-1">Írj elsőként!</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isFirstUnread = message.id === firstUnreadMessageId;
                    return (
                      <div key={message.id}>
                        {isFirstUnread && (
                          <div className="flex items-center gap-2 my-3" aria-label="Új üzenetek">
                            <div className="flex-1 border-t-2 border-dashed border-pepper-red" />
                            <span className="text-xs font-semibold text-pepper-red uppercase tracking-wide">
                              Új üzenetek
                            </span>
                            <div className="flex-1 border-t-2 border-dashed border-pepper-red" />
                          </div>
                        )}
                        <MessageItem
                          message={message}
                          users={users}
                          currentUserId={user.id}
                          onToggleTask={() => toggleTaskCompletion(message)}
                        />
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message input */}
              <div className="p-4 border-t border-gray-100">
                <form onSubmit={sendMessage}>
                  {/* Message type selector */}
                  <div className="flex gap-1 mb-2">
                    {Object.entries(MESSAGE_TYPES).map(([type, { icon: Icon, label }]) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setMessageType(type)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          messageType === type
                            ? 'bg-pepper-red text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Type-specific inputs */}
                  {messageType === 'link' && (
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input
                        type="url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="Link URL..."
                        className="rounded-lg border-gray-300 text-sm focus:ring-pepper-red focus:border-pepper-red"
                      />
                      <input
                        type="text"
                        value={linkTitle}
                        onChange={(e) => setLinkTitle(e.target.value)}
                        placeholder="Link címe (opcionális)"
                        className="rounded-lg border-gray-300 text-sm focus:ring-pepper-red focus:border-pepper-red"
                      />
                    </div>
                  )}

                  {messageType === 'task' && (
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <select
                        value={taskAssignee}
                        onChange={(e) => setTaskAssignee(e.target.value)}
                        className="rounded-lg border-gray-300 text-sm focus:ring-pepper-red focus:border-pepper-red"
                      >
                        <option value="">Felelős (opcionális)</option>
                        {Object.values(users).map((u) => (
                          <option key={u.id} value={u.id}>
                            {getDisplayName(u)}
                          </option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        className="rounded-lg border-gray-300 text-sm focus:ring-pepper-red focus:border-pepper-red"
                      />
                    </div>
                  )}

                  {/* Main input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && messageContent.trim()) {
                          e.preventDefault();
                          sendMessage(e);
                        }
                      }}
                      placeholder={
                        messageType === 'text'
                          ? 'Írj üzenetet...'
                          : messageType === 'link'
                            ? 'Link leírása...'
                            : 'Feladat leírása...'
                      }
                      className="flex-1 rounded-lg border-gray-300 focus:ring-pepper-red focus:border-pepper-red"
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      disabled={sending || !messageContent.trim()}
                      className="px-4 py-2 bg-pepper-red text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Küldés
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Hash className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Válassz egy csatornát a bal oldali listából</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Message item component
function MessageItem({ message, users, currentUserId, onToggleTask }) {
  const isOwnMessage = message.author_id === currentUserId;
  const userName = getDisplayName(users[message.author_id]);
  const assigneeName = message.task_assignee_id
    ? getDisplayName(users[message.task_assignee_id])
    : null;

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
        isOwnMessage ? 'bg-pepper-red' : 'bg-gray-400'
      }`}>
        {userName.charAt(0).toUpperCase()}
      </div>

      {/* Message content */}
      <div className={`max-w-[70%] ${isOwnMessage ? 'text-right' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900">{userName}</span>
          <span className="text-xs text-gray-400">{formatTime(message.created_at)}</span>
        </div>

        <div
          className={`rounded-lg p-3 ${
            message.message_type === 'task'
              ? message.task_completed
                ? 'bg-green-50 border border-green-200'
                : 'bg-yellow-50 border border-yellow-200'
              : message.message_type === 'link'
                ? 'bg-blue-50 border border-blue-200'
                : isOwnMessage
                  ? 'bg-pepper-red/10'
                  : 'bg-gray-100'
          }`}
        >
          {/* Task indicator */}
          {message.message_type === 'task' && (
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={onToggleTask}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  message.task_completed
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 hover:border-green-500'
                }`}
              >
                {message.task_completed && <Check className="h-3 w-3" />}
              </button>
              <span className={`text-xs font-medium ${message.task_completed ? 'text-green-600' : 'text-yellow-600'}`}>
                FELADAT
              </span>
              {assigneeName && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {assigneeName}
                </span>
              )}
              {message.task_deadline && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(message.task_deadline)}
                </span>
              )}
            </div>
          )}

          {/* Link indicator */}
          {message.message_type === 'link' && (
            <div className="flex items-center gap-2 mb-2">
              <LinkIcon className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-600">LINK</span>
            </div>
          )}

          {/* Message text */}
          <p className={`text-gray-800 ${message.task_completed ? 'line-through text-gray-500' : ''}`}>
            {message.content}
          </p>

          {/* Link button */}
          {message.message_type === 'link' && message.link_url && (
            <a
              href={message.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="h-3 w-3" />
              {message.link_title || 'Megnyitás'}
            </a>
          )}

          {/* Task completion info */}
          {message.message_type === 'task' && message.task_completed && message.task_completed_at && (
            <p className="text-xs text-green-600 mt-2">
              Kész: {formatDate(message.task_completed_at)}
              {message.task_completed_by && users[message.task_completed_by] && (
                <> - {getDisplayName(users[message.task_completed_by])}</>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
