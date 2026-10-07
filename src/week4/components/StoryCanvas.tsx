import { useState, useRef } from 'react';
import { StoryFrame, VisualStyle, DialogueBubble, UserAccount } from '../types';
import { Sparkles, Camera, PenTool, Image as ImageIcon, Plus, Trash2, Send } from 'lucide-react';

interface StoryCanvasProps {
  worldId: string;
  nextIndex: number;
  currentUser: UserAccount;
  onAddFrame: (frame: Omit<StoryFrame, 'id' | 'storyId' | 'createdAt' | 'likes'>) => void;
  onCancel: () => void;
}

const PRESET_ARTWORKS: Record<VisualStyle, string[]> = {
  claymation: [
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80',
  ],
  comic: [
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
  ],
  noir: [
    'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
  ],
  cyberpunk: [
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=800&q=80',
  ],
  watercolor: [
    'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
  ],
  sketch: [
    'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80',
  ],
  minimalist: [
    'https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?auto=format&fit=crop&w=800&q=80',
  ],
};

export default function StoryCanvas({
  worldId,
  nextIndex,
  currentUser,
  onAddFrame,
  onCancel,
}: StoryCanvasProps) {
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [sfx, setSfx] = useState('');
  const [style, setStyle] = useState<VisualStyle>('claymation');
  const [imageUrl, setImageUrl] = useState(PRESET_ARTWORKS.claymation[0]);
  const [dialogueList, setDialogueList] = useState<DialogueBubble[]>([
    {
      id: 'd_' + Date.now(),
      speaker: currentUser.name.split(' ')[0],
      text: 'What happens in this world next?',
      type: 'speech',
      x: 35,
      y: 40,
    },
  ]);

  // Sketch pad state
  const [activeTab, setActiveTab] = useState<'presets' | 'draw' | 'ai'>('presets');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#38bdf8');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Drawing canvas handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (canvasRef.current) {
      setImageUrl(canvasRef.current.toDataURL('image/jpeg', 0.85));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const addDialogueBubble = () => {
    setDialogueList((prev) => [
      ...prev,
      {
        id: 'd_' + Date.now(),
        speaker: 'Voice',
        text: '...',
        type: 'speech',
        x: Math.floor(Math.random() * 40 + 30),
        y: Math.floor(Math.random() * 40 + 30),
      },
    ]);
  };

  const removeDialogue = (id: string) => {
    setDialogueList((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !caption.trim()) {
      alert('Please provide a panel title and caption for the narrative sequence.');
      return;
    }

    onAddFrame({
      sequenceIndex: nextIndex,
      title: title.trim(),
      caption: caption.trim(),
      dialogue: dialogueList,
      sfx: sfx.trim() || undefined,
      imageUrl: imageUrl,
      visualStyle: style,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      authorReputation: currentUser.reputation,
      isAgent: currentUser.isAgent,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl p-6 shadow-2xl my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 bg-slate-800 rounded-xl">{currentUser.avatar}</span>
            <div>
              <h3 className="text-lg font-bold text-white">Create Sequence Frame #{nextIndex + 1}</h3>
              <p className="text-xs text-cyan-400 font-mono">
                Attributed to {currentUser.name} ({currentUser.handle}) · +15 Reputation
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white text-xs uppercase font-mono px-3 py-1.5 rounded-lg border border-slate-700"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Visual Artwork Picker / Drawer */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono uppercase text-slate-300">Frame Art Visual</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('presets')}
                  className={`text-xs px-2.5 py-1 rounded font-mono transition-colors ${
                    activeTab === 'presets'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3 h-3 inline mr-1" />
                  Gallery
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('draw')}
                  className={`text-xs px-2.5 py-1 rounded font-mono transition-colors ${
                    activeTab === 'draw'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <PenTool className="w-3 h-3 inline mr-1" />
                  Sketch
                </button>
              </div>
            </div>

            {activeTab === 'presets' && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {Object.entries(PRESET_ARTWORKS).flatMap(([st, urls]) =>
                  urls.map((url, i) => (
                    <button
                      key={`${st}-${i}`}
                      type="button"
                      onClick={() => {
                        setImageUrl(url);
                        setStyle(st as VisualStyle);
                      }}
                      className={`relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all ${
                        imageUrl === url
                          ? 'border-cyan-400 ring-2 ring-cyan-400/50 scale-95'
                          : 'border-slate-800 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt="art preset" className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 text-[9px] font-mono bg-black/80 text-white px-1 rounded">
                        {st}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}

            {activeTab === 'draw' && (
              <div className="flex flex-col items-center gap-2">
                <canvas
                  ref={canvasRef}
                  width={512}
                  height={320}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="w-full max-w-lg aspect-[16/10] bg-slate-950 rounded-xl border border-slate-700 cursor-crosshair shadow-inner"
                />
                <div className="flex items-center justify-between w-full max-w-lg text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Ink:</span>
                    {['#38bdf8', '#f43f5e', '#fbbf24', '#ffffff', '#a855f7'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setPenColor(c)}
                        className={`w-5 h-5 rounded-full border ${penColor === c ? 'ring-2 ring-white' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-rose-400 hover:text-rose-300"
                  >
                    Clear Sketch
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Title & Caption */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono uppercase text-slate-300 block mb-1">
                Panel Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. The Second Horizon"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-mono uppercase text-slate-300 block mb-1">
                Sound Effect / Onomatopoeia (Optional)
              </label>
              <input
                type="text"
                value={sfx}
                onChange={(e) => setSfx(e.target.value)}
                placeholder="e.g. *NOOT NOOT!*, *KZZZT*, *SWOOSH*"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-300 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-slate-300 block mb-1">
              Story Narrative Caption
            </label>
            <textarea
              required
              rows={2}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Describe what happens in this beat of the story..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Dialogue Bubbles Manager */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono uppercase text-slate-300">
                Dialogue & Speech Bubbles ({dialogueList.length})
              </label>
              <button
                type="button"
                onClick={addDialogueBubble}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Speech Bubble
              </button>
            </div>

            <div className="space-y-2 max-h-36 overflow-y-auto">
              {dialogueList.map((bubble, i) => (
                <div
                  key={bubble.id}
                  className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs"
                >
                  <input
                    type="text"
                    value={bubble.speaker}
                    onChange={(e) =>
                      setDialogueList((prev) =>
                        prev.map((d) => (d.id === bubble.id ? { ...d, speaker: e.target.value } : d))
                      )
                    }
                    placeholder="Speaker"
                    className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                  />
                  <input
                    type="text"
                    value={bubble.text}
                    onChange={(e) =>
                      setDialogueList((prev) =>
                        prev.map((d) => (d.id === bubble.id ? { ...d, text: e.target.value } : d))
                      )
                    }
                    placeholder="Spoken words"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                  />
                  <select
                    value={bubble.type}
                    onChange={(e) =>
                      setDialogueList((prev) =>
                        prev.map((d) =>
                          d.id === bubble.id ? { ...d, type: e.target.value as any } : d
                        )
                      )
                    }
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 font-mono"
                  >
                    <option value="speech">Speech</option>
                    <option value="shout">Shout</option>
                    <option value="thought">Thought</option>
                    <option value="whisper">Whisper</option>
                    <option value="narrator">Narrator</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeDialogue(bubble.id)}
                    className="text-rose-400 hover:text-rose-300 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-white rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase font-mono tracking-wider rounded-lg shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Publish Frame to Universe
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
