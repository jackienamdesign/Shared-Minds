import { useState } from 'react';
import { UserAccount, StoryWorld, StoryFrame } from '../types';
import { Bot, Users, Sparkles, Zap, Activity } from 'lucide-react';
import { SEED_AGENTS } from '../seedData';

interface AgentSimulatorProps {
  currentAgents: UserAccount[];
  worlds: StoryWorld[];
  onSpawnAgents: (count: number) => void;
  onSimulateAgentContribution: (agent: UserAccount, worldId: string) => void;
}

export default function AgentSimulator({
  currentAgents,
  worlds,
  onSpawnAgents,
  onSimulateAgentContribution,
}: AgentSimulatorProps) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    'Scale engine ready: Simulated agents generate narrative frames autonomously.',
    'Test the interface under a sprawl of automated creators.',
  ]);

  const runSimulationPulse = () => {
    setIsSimulating(true);
    // Pick random agent and random world
    const pool = currentAgents.length > 0 ? currentAgents : SEED_AGENTS;
    const agent = pool[Math.floor(Math.random() * pool.length)];
    const world = worlds[Math.floor(Math.random() * worlds.length)];

    if (world && agent) {
      onSimulateAgentContribution(agent, world.id);
      const actionText = `${agent.name} (${agent.handle}) published a new frame to "${world.title}"!`;
      setLogs((prev) => [actionText, ...prev.slice(0, 7)]);
    }

    setTimeout(() => setIsSimulating(false), 600);
  };

  return (
    <div className="bg-slate-900/90 border border-purple-800/40 rounded-2xl p-5 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-900/40 border border-purple-700/50 text-purple-300">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              Agent Swarm & Scale Laboratory
              <span className="text-[10px] font-mono uppercase bg-purple-900/80 text-purple-200 px-2 py-0.5 rounded-full border border-purple-700/50">
                Scale Testing
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Simulate synthetic creators & test the sprawl problem of social media
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSpawnAgents(5)}
            className="px-3 py-1.5 text-xs font-mono bg-purple-950/80 text-purple-300 hover:bg-purple-900 border border-purple-700/50 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            +5 Agents
          </button>
          <button
            onClick={runSimulationPulse}
            disabled={isSimulating}
            className="px-3.5 py-1.5 text-xs font-mono font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-500 hover:to-indigo-500 transition-all shadow-md shadow-purple-950 flex items-center gap-1.5"
          >
            <Zap className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
            Trigger Swarm Pulse
          </button>
        </div>
      </div>

      {/* Agents Roster Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-3 scrollbar-thin">
        {currentAgents.map((agent) => (
          <div
            key={agent.id}
            className="shrink-0 bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2.5 w-48 shadow-sm hover:border-purple-500/50 transition-colors"
          >
            <span className="text-2xl p-1 bg-slate-900 rounded-lg">{agent.avatar}</span>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-white truncate">{agent.name}</div>
              <div className="text-[10px] text-purple-400 font-mono truncate">{agent.handle}</div>
              <div className="text-[9px] text-amber-400 font-mono mt-0.5">★ {agent.reputation} Rep</div>
            </div>
          </div>
        ))}
      </div>

      {/* Swarm Activity Log */}
      <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/80 font-mono text-xs">
        <div className="flex items-center gap-2 text-slate-500 text-[10px] uppercase tracking-wider mb-1.5">
          <Activity className="w-3 h-3 text-purple-400 animate-pulse" />
          Autonomous Swarm Event Stream
        </div>
        <div className="space-y-1">
          {logs.map((log, i) => (
            <div
              key={i}
              className={`leading-relaxed truncate ${
                i === 0 ? 'text-purple-300 font-semibold' : 'text-slate-400 text-[11px]'
              }`}
            >
              › {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
