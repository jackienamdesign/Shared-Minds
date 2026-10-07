import { useState, useEffect } from 'react';
import {
  StoryWorld,
  StoryFrame,
  UserAccount,
  NavigatorViewMode,
} from './types';
import {
  subscribeToWorlds,
  subscribeToFrames,
  setupAuthListener,
  saveUser,
  createStoryWorld,
  addStoryFrame,
  likeStoryFrame,
} from './firebaseStory';
import { SEED_AGENTS } from './seedData';
import MultiverseGraph from './components/MultiverseGraph';
import ResonanceRadar from './components/ResonanceRadar';
import MoviePlayer from './components/MoviePlayer';
import StoryCanvas from './components/StoryCanvas';
import AgentSimulator from './components/AgentSimulator';
import AuthModal from './components/AuthModal';

import {
  Compass,
  Film,
  Plus,
  Heart,
  GitBranch,
  Sparkles,
  Bot,
  User,
  Search,
  Filter,
  Layers,
  Radio,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Eye,
} from 'lucide-react';

export default function StoryWorlds() {
  const [worlds, setWorlds] = useState<StoryWorld[]>([]);
  const [selectedWorldId, setSelectedWorldId] = useState<string | null>('world_pingu_adventure');
  const [activeFrames, setActiveFrames] = useState<StoryFrame[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount>({
    id: 'user_init',
    name: 'Curious Storyteller',
    handle: '@storyteller',
    avatar: '🎨',
    reputation: 100,
    badges: ['Pioneer'],
    isAgent: false,
    role: 'human',
    joinedAt: Date.now(),
  });

  const [viewMode, setViewMode] = useState<NavigatorViewMode>('constellation');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isMovieOpen, setIsMovieOpen] = useState(false);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCreatingWorld, setIsCreatingWorld] = useState(false);

  // New World Form State
  const [newWorldTitle, setNewWorldTitle] = useState('');
  const [newWorldLogline, setNewWorldLogline] = useState('');
  const [newWorldGenre, setNewWorldGenre] = useState<StoryWorld['genre']>('Claymation Fantasy');

  // Agents list
  const [agents, setAgents] = useState<UserAccount[]>(SEED_AGENTS);

  // Setup Auth & World Sync
  useEffect(() => {
    setupAuthListener((user) => setCurrentUser(user));
    const unsubscribeWorlds = subscribeToWorlds((loadedWorlds) => {
      setWorlds(loadedWorlds);
      if (!selectedWorldId && loadedWorlds.length > 0) {
        setSelectedWorldId(loadedWorlds[0].id);
      }
    });

    return () => {
      if (unsubscribeWorlds) unsubscribeWorlds();
    };
  }, []);

  // Sync Frames for selected world
  useEffect(() => {
    if (!selectedWorldId) return;
    const unsubscribeFrames = subscribeToFrames(selectedWorldId, (loadedFrames) => {
      setActiveFrames(loadedFrames);
    });

    return () => {
      if (unsubscribeFrames) unsubscribeFrames();
    };
  }, [selectedWorldId]);

  const selectedWorld = worlds.find((w) => w.id === selectedWorldId) || worlds[0];

  // Handler for adding a frame
  const handleAddFrame = async (
    frameData: Omit<StoryFrame, 'id' | 'storyId' | 'createdAt' | 'likes'>
  ) => {
    if (!selectedWorldId) return;
    await addStoryFrame(selectedWorldId, frameData);
    setIsCanvasOpen(false);

    // Increase user karma for contributing
    const updatedUser = {
      ...currentUser,
      reputation: currentUser.reputation + 25,
      badges: Array.from(new Set([...currentUser.badges, 'Frame Contributor'])),
    };
    setCurrentUser(updatedUser);
    saveUser(updatedUser);
  };

  // Handler for liking frame
  const handleLike = async (frameId: string, authorId: string) => {
    if (!selectedWorldId) return;
    await likeStoryFrame(selectedWorldId, frameId, authorId);
  };

  // Handler for spawning synthetic agents
  const handleSpawnAgents = (count: number) => {
    const prefixes = ['Nova', 'Kaito', 'Zephyr', 'Orion', 'Lyra', 'Vesper', 'Pixel', 'Clay'];
    const emojis = ['🤖', '🐧', '⚡', '🌙', '🌌', '🚀', '🎨', '✨'];
    const newAgents: UserAccount[] = [];

    for (let i = 0; i < count; i++) {
      const p = prefixes[Math.floor(Math.random() * prefixes.length)];
      const num = Math.floor(Math.random() * 899 + 100);
      newAgents.push({
        id: `agent_${Date.now()}_${i}`,
        name: `${p}-${num}`,
        handle: `@${p.toLowerCase()}_${num}`,
        avatar: emojis[Math.floor(Math.random() * emojis.length)],
        bio: 'Synthetic autonomous creator testing narrative sprawl.',
        reputation: Math.floor(Math.random() * 800 + 200),
        badges: ['Simulated Agent', 'Sprawl Contributor'],
        isAgent: true,
        role: 'agent',
        joinedAt: Date.now(),
      });
    }

    setAgents((prev) => [...prev, ...newAgents]);
  };

  // Handler for simulated agent contribution
  const handleSimulateContribution = async (agent: UserAccount, targetWorldId: string) => {
    const captions = [
      'A transmission pulsed across the frozen relay antenna.',
      'The ink separated on the canvas, revealing a hidden door.',
      'The train crossed the boundary where gravity stopped applying.',
      'In the quiet alleyway, a mechanical sparrow spoke in morse code.',
    ];
    const sfxList = ['*PING!*', '*CREEEAK*', '*ZAP!*', '*WHISPER...*', '*NOOT NOOT!*'];
    const artworks = [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?auto=format&fit=crop&w=800&q=80',
    ];

    const targetWorld = worlds.find((w) => w.id === targetWorldId);
    const existingFrames = activeFrames.length;

    await addStoryFrame(targetWorldId, {
      sequenceIndex: existingFrames,
      title: `Branch Episode: ${agent.name}`,
      caption: captions[Math.floor(Math.random() * captions.length)],
      sfx: sfxList[Math.floor(Math.random() * sfxList.length)],
      imageUrl: artworks[Math.floor(Math.random() * artworks.length)],
      visualStyle: 'claymation',
      authorId: agent.id,
      authorName: agent.name,
      authorAvatar: agent.avatar,
      authorReputation: agent.reputation,
      isAgent: true,
      dialogue: [
        {
          id: 'sim_' + Date.now(),
          speaker: agent.name.split('-')[0],
          text: 'Continuity registered in the multiverse stream.',
          type: 'speech',
          x: 45,
          y: 40,
        },
      ],
    });
  };

  // Handler to create a new story world
  const handleCreateWorldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorldTitle.trim() || !newWorldLogline.trim()) return;

    const colors = ['#0284c7', '#38bdf8', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6'];
    const created = await createStoryWorld({
      title: newWorldTitle.trim(),
      logline: newWorldLogline.trim(),
      genre: newWorldGenre,
      moodX: (Math.random() - 0.5) * 1.6,
      moodY: (Math.random() - 0.5) * 1.6,
      tags: [newWorldGenre, 'Multi-User', 'Interactive'],
      creatorId: currentUser.id,
      creatorName: currentUser.name,
      creatorAvatar: currentUser.avatar,
      color: colors[Math.floor(Math.random() * colors.length)],
      galaxyCoord: {
        x: Math.floor(Math.random() * 400 - 200),
        y: Math.floor(Math.random() * 400 - 200),
        orbitRadius: Math.floor(Math.random() * 140 + 180),
        speed: 0.0003 + Math.random() * 0.0003,
        phase: Math.random() * Math.PI * 2,
      },
    });

    setIsCreatingWorld(false);
    setNewWorldTitle('');
    setNewWorldLogline('');
    setSelectedWorldId(created.id);
  };

  // Filter worlds for search and buttons
  const filteredWorlds = worlds.filter((w) => {
    const matchesSearch =
      w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.logline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.creatorName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeFilter === 'humans') return !w.creatorId.startsWith('agent_');
    if (activeFilter === 'agents') return w.creatorId.startsWith('agent_');
    if (activeFilter === 'clay') return w.genre.includes('Claymation') || w.tags.includes('Claymation');
    if (activeFilter === 'high_rep') return w.starsCount > 80;
    return true;
  });

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 px-4 md:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Logo & Coursework Link */}
          <div className="flex items-center gap-4">
            <a
              href="#/"
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/50 border border-cyan-800/40"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              All Projects
            </a>
            <div className="h-4 w-[1px] bg-slate-800" />
            <div>
              <h1 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                <span className="text-cyan-400">Shared Worlds</span>
                <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                  Week 4 · Multi-User
                </span>
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">
                Collaborative living comic & storyboard studio across parallel creator realities
              </p>
            </div>
          </div>

          {/* Right User Bar & New World CTA */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsCreatingWorld(true)}
              className="px-3.5 py-1.5 text-xs font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              New World
            </button>

            {/* User Profile Pill (Accountability & Reputation) */}
            <button
              onClick={() => setIsAuthOpen(true)}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-lg transition-colors text-left"
              title="View Storyteller Karma & Accountability Profile"
            >
              <span className="text-lg">{currentUser.avatar}</span>
              <div className="text-xs font-mono">
                <div className="text-white font-medium flex items-center gap-1">
                  {currentUser.name}
                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                </div>
                <div className="text-amber-400 text-[10px]">★ {currentUser.reputation} Rep</div>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Navigation Mode Switcher Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
          {/* View Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
            <button
              onClick={() => setViewMode('constellation')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all ${
                viewMode === 'constellation'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Constellation Galaxy
            </button>
            <button
              onClick={() => setViewMode('radar')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all ${
                viewMode === 'radar'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Resonance Radar (2D Matrix)
            </button>
            <button
              onClick={() => setViewMode('timelines')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all ${
                viewMode === 'timelines'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Parallel Storyboards
            </button>
            <button
              onClick={() => setViewMode('creators')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all ${
                viewMode === 'creators'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              Agent Swarm Laboratory ({agents.length})
            </button>
          </div>

          {/* Quick Search & Filter Chips */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-48">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search worlds & users..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 rounded-lg px-2.5 py-1.5"
            >
              <option value="all">All Realities</option>
              <option value="humans">Human Only</option>
              <option value="agents">Agent Swarm</option>
              <option value="clay">Clay & Pingu</option>
              <option value="high_rep">High Karma (80★+)</option>
            </select>
          </div>
        </div>

        {/* View Mode Component Panels */}
        {viewMode === 'constellation' && (
          <MultiverseGraph
            worlds={filteredWorlds}
            selectedWorldId={selectedWorldId}
            onSelectWorld={(id) => setSelectedWorldId(id)}
            activeFilter={activeFilter}
          />
        )}

        {viewMode === 'radar' && (
          <ResonanceRadar
            worlds={filteredWorlds}
            selectedWorldId={selectedWorldId}
            onSelectWorld={(id) => setSelectedWorldId(id)}
          />
        )}

        {viewMode === 'creators' && (
          <AgentSimulator
            currentAgents={agents}
            worlds={worlds}
            onSpawnAgents={handleSpawnAgents}
            onSimulateAgentContribution={handleSimulateContribution}
          />
        )}

        {/* Active Selected Story World Showcase */}
        {selectedWorld && (
          <section className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
            {/* World Header Info */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="flex items-start gap-4">
                <span className="text-4xl p-3 bg-slate-950 rounded-2xl border border-slate-800 shrink-0 shadow-lg">
                  {selectedWorld.creatorAvatar}
                </span>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 bg-cyan-950/50 border border-cyan-800/40 px-2 py-0.5 rounded">
                      {selectedWorld.genre}
                    </span>
                    <span className="text-xs font-mono text-amber-400">
                      ★ {selectedWorld.starsCount} Karma Stars
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    {selectedWorld.title}
                  </h2>
                  <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    {selectedWorld.logline}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs font-mono text-slate-400">
                    <span>
                      World Originator:{' '}
                      <strong className="text-white">{selectedWorld.creatorName}</strong>
                    </span>
                    <span>·</span>
                    <span>{activeFrames.length} Panels Sequence</span>
                    <span>·</span>
                    <span>{selectedWorld.branchesCount} Story Branches</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Play Movie & Add Frame */}
              <div className="flex items-center gap-3 w-full lg:w-auto">
                <button
                  onClick={() => setIsMovieOpen(true)}
                  disabled={activeFrames.length === 0}
                  className="flex-1 lg:flex-none px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase font-mono tracking-wider rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
                >
                  <Film className="w-4 h-4" />
                  Play Sequence Movie
                </button>

                <button
                  onClick={() => setIsCanvasOpen(true)}
                  className="flex-1 lg:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-medium rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4 text-cyan-400" />
                  Add Frame #{activeFrames.length + 1}
                </button>
              </div>
            </div>

            {/* The Sequence of Still Frames / Graphic Panels */}
            <div className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Sequential Comic Frames ({activeFrames.length})
                </h3>
                <span className="text-xs font-mono text-slate-500">
                  Left to right sequential narrative progression
                </span>
              </div>

              {activeFrames.length === 0 ? (
                <div className="text-center py-16 bg-slate-950/60 rounded-xl border border-dashed border-slate-800">
                  <p className="text-sm text-slate-400 font-mono mb-3">
                    This world is awaiting its premiere frame.
                  </p>
                  <button
                    onClick={() => setIsCanvasOpen(true)}
                    className="px-4 py-2 bg-cyan-500 text-slate-950 text-xs font-mono font-bold rounded-lg"
                  >
                    Draw or Generate First Frame
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeFrames.map((frame, index) => (
                    <article
                      key={frame.id}
                      className="bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl hover:border-cyan-500/40 transition-all flex flex-col group"
                    >
                      {/* Frame Artwork Preview with SFX and Bubbles */}
                      <div className="relative aspect-[16/10] bg-slate-900 overflow-hidden">
                        <img
                          src={frame.imageUrl}
                          alt={frame.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />

                        {/* Panel Number Badge */}
                        <div className="absolute top-2.5 left-2.5 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded font-mono text-[11px] font-bold text-cyan-300 border border-cyan-500/30">
                          #{index + 1}
                        </div>

                        {/* Onomatopoeia SFX Badge */}
                        {frame.sfx && (
                          <div className="absolute top-2.5 right-2.5 transform rotate-6">
                            <span className="bg-amber-400 text-slate-950 font-black text-xs font-mono uppercase px-2 py-0.5 rounded shadow-lg border border-amber-300">
                              {frame.sfx}
                            </span>
                          </div>
                        )}

                        {/* Floating Dialogue Bubbles Preview */}
                        {frame.dialogue && frame.dialogue.length > 0 && (
                          <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-1 pointer-events-none">
                            {frame.dialogue.slice(0, 1).map((d) => (
                              <div
                                key={d.id}
                                className="bg-white/95 text-slate-950 px-2 py-1 rounded-lg text-[11px] font-medium shadow-md border border-slate-300 truncate max-w-[85%]"
                              >
                                <strong className="uppercase text-[9px] text-slate-500 mr-1">
                                  {d.speaker}:
                                </strong>
                                {d.text}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Frame Caption & Information */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-white mb-1">{frame.title}</h4>
                          <p className="text-xs text-slate-300 leading-relaxed font-serif italic mb-3">
                            "{frame.caption}"
                          </p>
                        </div>

                        {/* Author Accountability Card & Like Heart */}
                        <div className="pt-3 border-t border-slate-900 flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{frame.authorAvatar}</span>
                            <div className="overflow-hidden">
                              <div className="text-white text-[11px] truncate flex items-center gap-1">
                                {frame.authorName}
                                {frame.isAgent ? (
                                  <span className="text-[8px] px-1 bg-purple-900/60 text-purple-300 rounded">
                                    AI
                                  </span>
                                ) : (
                                  <span className="text-[8px] px-1 bg-emerald-900/60 text-emerald-300 rounded">
                                    HUMAN
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                ★ {frame.authorReputation} Rep
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleLike(frame.id, frame.authorId)}
                              className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1"
                              title="Upvote frame / Award karma"
                            >
                              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/30" />
                              <span className="text-[11px]">{frame.likes}</span>
                            </button>

                            <button
                              onClick={() => setIsCanvasOpen(true)}
                              className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-cyan-400 transition-colors"
                              title="Branch storyline from this frame"
                            >
                              <GitBranch className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Movie Cinema Modal */}
      {isMovieOpen && selectedWorld && (
        <MoviePlayer
          world={selectedWorld}
          frames={activeFrames}
          onClose={() => setIsMovieOpen(false)}
          onLikeFrame={handleLike}
        />
      )}

      {/* Frame Creator / Drawing Canvas Modal */}
      {isCanvasOpen && selectedWorld && (
        <StoryCanvas
          worldId={selectedWorld.id}
          nextIndex={activeFrames.length}
          currentUser={currentUser}
          onAddFrame={handleAddFrame}
          onCancel={() => setIsCanvasOpen(false)}
        />
      )}

      {/* Storyteller Auth & Accountability Modal */}
      {isAuthOpen && (
        <AuthModal
          user={currentUser}
          onUpdateUser={(updated) => {
            setCurrentUser(updated);
            saveUser(updated);
          }}
          onClose={() => setIsAuthOpen(false)}
        />
      )}

      {/* Create World Modal */}
      {isCreatingWorld && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Create a New Story World</h3>
            <p className="text-xs text-slate-400 mb-4 font-mono">
              Inaugurate a new story realm for humans & agents to build together
            </p>

            <form onSubmit={handleCreateWorldSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-mono uppercase text-slate-300 block mb-1">
                  World Title
                </label>
                <input
                  type="text"
                  required
                  value={newWorldTitle}
                  onChange={(e) => setNewWorldTitle(e.target.value)}
                  placeholder="e.g. Chronicles of the Sub-Zero Clay"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-mono uppercase text-slate-300 block mb-1">
                  Premise / Logline
                </label>
                <textarea
                  required
                  rows={2}
                  value={newWorldLogline}
                  onChange={(e) => setNewWorldLogline(e.target.value)}
                  placeholder="What is the central tension or premise of this world?"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs font-mono uppercase text-slate-300 block mb-1">
                  Genre
                </label>
                <select
                  value={newWorldGenre}
                  onChange={(e) => setNewWorldGenre(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
                >
                  <option value="Claymation Fantasy">Claymation Fantasy</option>
                  <option value="Sci-Fi">Sci-Fi</option>
                  <option value="Noir">Noir</option>
                  <option value="Surrealism">Surrealism</option>
                  <option value="Slice of Life">Slice of Life</option>
                  <option value="Mythology">Mythology</option>
                  <option value="Poetry">Poetry</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingWorld(false)}
                  className="px-3 py-1.5 text-xs font-mono text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono rounded-lg transition-colors"
                >
                  Launch World
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
