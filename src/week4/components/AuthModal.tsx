import { useState } from 'react';
import { UserAccount } from '../types';
import { volunteerIdentity } from '../firebaseStory';
import { ShieldCheck, Award, User, Sparkles, Check } from 'lucide-react';

interface AuthModalProps {
  user: UserAccount;
  onUpdateUser: (updated: UserAccount) => void;
  onClose: () => void;
}

const AVATAR_OPTIONS = ['🎨', '🐧', '🚀', '🌌', '✒️', '🎬', '⚡', '🌙', '🎭', '✨', '🥐', '🕵️'];

export default function AuthModal({ user, onUpdateUser, onClose }: AuthModalProps) {
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserAccount = {
      ...user,
      name: name.trim() || user.name,
      handle: '@' + (name.trim() || user.name).toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 16),
      bio: bio.trim(),
      avatar: selectedAvatar,
      reputation: user.reputation + 10, // Reputation bonus for profile completeness
      badges: Array.from(new Set([...user.badges, 'Verified Identity'])),
    };
    onUpdateUser(updated);
    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const handleVolunteerPrompt = () => {
    const updated = volunteerIdentity(user);
    onUpdateUser(updated);
    setName(updated.name);
    setSelectedAvatar(updated.avatar);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Storyteller Accountability & Karma</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs font-mono px-2 py-1"
          >
            ✕
          </button>
        </div>

        {/* Reputation & Badges Banner */}
        <div className="bg-gradient-to-r from-cyan-950/80 to-slate-950 p-4 rounded-xl border border-cyan-800/40 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl p-1 bg-slate-900 rounded-lg">{selectedAvatar}</span>
              <div>
                <div className="text-sm font-bold text-white">{name}</div>
                <div className="text-xs text-cyan-400 font-mono">{user.handle}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-mono font-bold text-amber-400">★ {user.reputation}</div>
              <div className="text-[10px] uppercase font-mono text-slate-400">Story Karma</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-cyan-900/40">
            {user.badges.map((b) => (
              <span
                key={b}
                className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-900/60 text-cyan-200 border border-cyan-700/50 flex items-center gap-1"
              >
                <Award className="w-3 h-3 text-amber-400" /> {b}
              </span>
            ))}
          </div>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-mono uppercase text-slate-300 block mb-1">
              Choose Avatar
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {AVATAR_OPTIONS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setSelectedAvatar(av)}
                  className={`text-xl p-2 rounded-lg border transition-transform ${
                    selectedAvatar === av
                      ? 'bg-cyan-950 border-cyan-400 scale-110'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-slate-300 block mb-1">
              Creative Name / Moniker
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-slate-300 block mb-1">
              Creator Bio
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What stories or frames do you build?"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handleVolunteerPrompt}
              className="text-xs font-mono text-cyan-400 hover:underline"
            >
              Use volunteer prompt prompt()
            </button>

            <button
              type="submit"
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5"
            >
              {isSaved ? <Check className="w-4 h-4 text-emerald-950" /> : <Sparkles className="w-4 h-4" />}
              {isSaved ? 'Identity Saved!' : 'Save Identity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
