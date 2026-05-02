import React, { useMemo, useState, useEffect, useRef } from 'react';
import { CAUSAL_MAP } from '../../../constants/causalMap';
import { getBlockedRCs, calculateCausalScore, resolveCatalogFormationForRc, getRobustnessMultiplier } from '../../../utils/causalEngine';
import { Network, Search, Target, ShieldAlert, Zap, Clock, Info } from 'lucide-react';

// --- CONFIGURATION ---
const X_COLS = {
  L0: 100,  // 10%
  L1: 300,  // 30%
  L2: 520,  // 52%
  L3: 720,  // 72%
  L4: 900   // 90%
};

// Custom Short Labels (max 3 words)
const SHORT_LABELS = {
  RC1: "Éthique & Posture",
  RC2: "Savoirs disciplin.",
  RC3: "Didactique",
  RC4: "Langue d'enseign.",
  RC5: "Conception & Planif.",
  RC6: "Mise en œuvre",
  RC7: "Évaluation",
  RC8: "Progression",
  RC9: "Différenciation",
  RC10: "Coopération",
  RC11: "Dév. professionnel",
  RC12: "Numérique"
};

const NODE_POSITIONS = {
  RC1: { x: X_COLS.L0, y: 150 },
  RC2: { x: X_COLS.L0, y: 350 },
  RC4: { x: X_COLS.L0, y: 550 },
  
  RC3: { x: X_COLS.L1, y: 450 },
  RC5: { x: X_COLS.L1, y: 250 },
  
  RC6: { x: X_COLS.L2, y: 400 },
  RC7: { x: X_COLS.L2, y: 200 },
  RC8: { x: X_COLS.L2, y: 600 },
  
  RC9: { x: X_COLS.L3, y: 400 },
  
  RC10: { x: X_COLS.L4, y: 150 },
  RC11: { x: X_COLS.L4, y: 350 },
  RC12: { x: X_COLS.L4, y: 550 },
};

const NODE_COLORS = {
  CRITICAL: { max: 2.0, hex: '#8B0000', label: 'Critique' },
  SIGNIFICANT: { max: 2.5, hex: '#CC4400', label: 'Déficit significatif' },
  MODERATE: { max: 3.0, hex: '#CC8800', label: 'Déficit modéré' },
  VIGILANCE: { max: 3.5, hex: '#4A7C00', label: 'Zone de vigilance' },
  SATISFACTORY: { max: 5.0, hex: '#1A6B1A', label: 'Satisfaisant' }
};

function getNodeColorObj(score) {
  if (score < 2.0) return NODE_COLORS.CRITICAL;
  if (score < 2.5) return NODE_COLORS.SIGNIFICANT;
  if (score < 3.0) return NODE_COLORS.MODERATE;
  if (score < 3.5) return NODE_COLORS.VIGILANCE;
  return NODE_COLORS.SATISFACTORY;
}

function getRobustnessBadge(teacherCount, sourceCount) {
    if (sourceCount >= 2) return { color: '#1A6B1A', label: 'Robuste' };      // 🟢
    if (sourceCount >= 1.5) return { color: '#CC8800', label: 'Probable' };   // 🟡
    if (sourceCount >= 1) return { color: '#CC4400', label: 'Préliminaire' }; // 🟠
    return { color: '#8B0000', label: 'Insuffisant' };                        // 🔴
}

export function CausalTree({ 
    store, 
    aggregateScores, 
    allAggregateScores, 
    participants,
    threshold = 3.0,
    robustnessLevel = 'robust'
}) {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipNode, setTooltipNode] = useState(null);
  const [hoveredLink, setHoveredLink] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeCirco, setActiveCirco] = useState('GLOBAL');
  
  // What-If state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedScores, setSimulatedScores] = useState({});
  const [showT0T1, setShowT0T1] = useState(false);
  
  // View Mode: structure (lignes) vs flux (Sankey)
  const [viewMode, setViewMode] = useState('structure');

  // Animation Double Click
  const [animatingRoot, setAnimatingRoot] = useState(null);
  const [litNodes, setLitNodes] = useState(new Set());

  const hoverTimeoutRef = useRef(null);

  const circos = useMemo(() => ['GLOBAL', ...new Set(participants.map(p => p['Circonscription']).filter(Boolean))], [participants]);
  
  // Baseline scores based on Circo filter
  const baselineScores = useMemo(() => {
      if (activeCirco === 'GLOBAL') return aggregateScores;
      return allAggregateScores[activeCirco] || aggregateScores;
  }, [allAggregateScores, activeCirco, aggregateScores]);

  // Current active scores (Baseline + Simulation overrides)
  const currentScores = useMemo(() => {
      if (!isSimulating) return baselineScores;
      return { ...baselineScores, ...simulatedScores };
  }, [baselineScores, simulatedScores, isSimulating]);

  // Nodes Data Calculation
  const treeNodes = useMemo(() => {
    return Object.keys(CAUSAL_MAP).map(id => {
      const score = currentScores[id] || 0;
      const baseScore = baselineScores[id] || 0;
      const comp = CAUSAL_MAP[id];
      const blocked = getBlockedRCs(id);
      
      const { formation, ipf } = resolveCatalogFormationForRc(id, store.referential);
      const causalResult = calculateCausalScore(id, score, blocked.length, ipf, robustnessLevel);
      
      let sourceCount = 0;
      let validParticipants = participants;
      if (activeCirco !== 'GLOBAL') {
          validParticipants = participants.filter(p => p['Circonscription'] === activeCirco);
      }
      validParticipants.forEach(p => {
          if (p.scores?.[id] != null) sourceCount += 0.5;
          if (p.realityScores?.[id] != null && p.hasVisit) sourceCount += 0.5;
      });
      const avgSources = validParticipants.length > 0 ? sourceCount / validParticipants.length : 0;
      const robustnessBadge = getRobustnessBadge(validParticipants.length, avgSources);

      return {
        id,
        ...comp,
        score,
        baseScore,
        blocked,
        causalScore: causalResult.score,
        formation,
        ipf,
        robustnessBadge,
        isDeficient: score < threshold,
        radius: 25 + (blocked.length * 3), // Diameter = 50 + blocked*6
        colorObj: getNodeColorObj(score),
        isPivot: blocked.length >= 5,
        pos: NODE_POSITIONS[id] || { x: 500, y: 300 }
      };
    });
  }, [currentScores, baselineScores, participants, activeCirco, threshold, store.referential, robustnessLevel]);

  // Links Data Calculation
  const treeLinks = useMemo(() => {
    const links = [];
    treeNodes.forEach(node => {
      node.prerequisites.forEach(prereqId => {
        const prereqNode = treeNodes.find(n => n.id === prereqId);
        if (prereqNode) {
            let color = '#475569'; // Slate-600 (more visible grey)
            let width = 1;
            let dashed = true;
            let status = 'Chaîne fermée (prérequis OK)';

            if (prereqNode.score < threshold) {
                if (node.score < threshold) {
                    color = '#FF4444'; // Blocking flow
                    width = 3.5;
                    dashed = false;
                    status = 'Chaîne de blocage ACTIVE';
                } else if (node.score >= 2.8 && node.score <= 3.0) {
                    color = '#FF8C00'; // Orange
                    width = 2;
                    dashed = false;
                    status = 'À surveiller (cible limite)';
                } else {
                    // Source deficient but target somehow fine (resilience)
                    color = '#555555';
                }
            }

            links.push({
                source: prereqNode,
                target: node,
                id: `${prereqId}-${node.id}`,
                color,
                width,
                dashed,
                status,
                weight: (node.blocked?.length || 0) + 1
            });
        }
      });
    });
    return links;
  }, [treeNodes, threshold]);

  // Upstream / Downstream calculation for selection
  const getChainSets = (nodeId) => {
      const upstream = new Set();
      const findUpstream = (id) => {
          CAUSAL_MAP[id]?.prerequisites.forEach(p => { upstream.add(p); findUpstream(p); });
      }
      findUpstream(nodeId);

      const downstream = new Set();
      const findDownstream = (id) => {
          CAUSAL_MAP[id]?.dependents.forEach(d => { downstream.add(d); findDownstream(d); });
      }
      findDownstream(nodeId);
      
      return { upstream, downstream };
  };

  const activeChains = selectedNode ? getChainSets(selectedNode) : null;
  const hoverChains = hoveredNode ? getChainSets(hoveredNode.id) : null;

  // Interaction Handlers
  const handleNodeMouseEnter = (node) => {
      setHoveredNode(node);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = setTimeout(() => {
          setTooltipNode(node);
      }, 400);
  };

  const handleNodeMouseLeave = () => {
      setHoveredNode(null);
      setTooltipNode(null);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };

  const handleNodeClick = (nodeId) => {
      setSelectedNode(selectedNode === nodeId ? null : nodeId);
  };

  const handleNodeDoubleClick = (node) => {
      if (!node.prerequisites || node.prerequisites.length > 0) return; // Only roots
      setAnimatingRoot(node.id);
      
      const newLit = new Set([node.id]);
      setLitNodes(new Set(newLit));
      
      const animateDown = (currentId, delay) => {
          setTimeout(() => {
              const deps = CAUSAL_MAP[currentId]?.dependents || [];
              if (deps.length > 0) {
                  deps.forEach(dep => {
                      newLit.add(dep);
                      animateDown(dep, delay + 300);
                  });
                  setLitNodes(new Set(newLit));
              }
          }, delay);
      };
      
      animateDown(node.id, 300);
      
      setTimeout(() => {
          setAnimatingRoot(null);
          setLitNodes(new Set());
          setSelectedNode(node.id);
      }, 2000);
  };

  const handleSimulateChange = (nodeId, val) => {
      const newScore = parseFloat(val);
      const newSims = { ...simulatedScores, [nodeId]: newScore };
      
      // Cascading effect (simple heuristic)
      const { downstream } = getChainSets(nodeId);
      downstream.forEach(depId => {
          const comp = CAUSAL_MAP[depId];
          const prereqs = comp.prerequisites;
          const allSatisfied = prereqs.every(p => {
             const s = newSims[p] !== undefined ? newSims[p] : baselineScores[p];
             return s >= threshold;
          });
          
          if (allSatisfied) {
              const diff = newScore - baselineScores[nodeId];
              newSims[depId] = Math.min(5, baselineScores[depId] + (diff * 0.4));
          } else {
             // If not all satisfied, revert to baseline if it was simulated
             if (newSims[depId] !== undefined) delete newSims[depId];
          }
      });
      
      setSimulatedScores(newSims);
  };

  const getMetrics = () => {
      const activeChainsCount = treeLinks.filter(l => l.color === '#FF4444').length;
      const deficientNodes = treeNodes.filter(n => n.score < threshold).length;
      const satisfactoryNodes = treeNodes.filter(n => n.score >= threshold).length;
      return { activeChainsCount, deficientNodes, satisfactoryNodes };
  };

  const metrics = getMetrics();

  return (
    <div className="bg-[#111827] rounded-[32px] shadow-2xl overflow-hidden flex flex-col h-[850px] border border-slate-800 text-slate-100 relative font-sans">
      
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0 bg-[#0F172A]">
          <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                  <Network size={24} />
              </div>
              <div>
                  <h3 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-3">
                      Carte Systémique Causale <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-[9px] rounded-md border border-indigo-500/30 font-black">v4.0</span>
                      {isSimulating && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] rounded animate-pulse border border-amber-500/30">SIMULATION ACTIVE</span>}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">RCET — Propagation des déficits</p>
              </div>
          </div>
          
          <div className="flex items-center gap-4">
              {/* Filtres Circo */}
              <div className="flex bg-[#1E293B] rounded-xl p-1.5 border border-[#334155]">
                  {circos.map(c => (
                      <button
                          key={c}
                          onClick={() => { setActiveCirco(c); setSimulatedScores({}); }}
                          className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${
                              activeCirco === c ? 'bg-[#3B82F6] text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                          }`}
                      >
                          {c}
                      </button>
                  ))}
              </div>

              <div className="h-8 w-px bg-slate-700 mx-2" />
              
              {/* Actions */}
              <div className="flex gap-2">
                  <div className="flex bg-[#1E293B] rounded-xl p-1 border border-[#334155] mr-2">
                      <button
                          onClick={() => setViewMode('structure')}
                          className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${
                              viewMode === 'structure' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                          }`}
                      >
                          Vue Structure
                      </button>
                      <button
                          onClick={() => setViewMode('flux')}
                          className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${
                              viewMode === 'flux' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                          }`}
                      >
                          Vue Flux
                      </button>
                  </div>
                  
                  <button 
                      onClick={() => { setIsSimulating(!isSimulating); setSimulatedScores({}); setShowT0T1(false); }}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          isSimulating ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-[#1E293B] text-slate-300 hover:bg-slate-700 border border-[#334155]'
                      }`}
                  >
                      <Zap size={14} className={isSimulating ? 'animate-pulse' : ''} />
                      MODE SIMULATION
                  </button>
                  
                  {isSimulating && (
                      <button 
                          onClick={() => setShowT0T1(!showT0T1)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                              showT0T1 ? 'bg-indigo-500 text-white' : 'bg-[#1E293B] text-slate-300 hover:bg-slate-700 border border-[#334155]'
                          }`}
                      >
                          <Clock size={14} />
                          COMPARER T0/T1
                      </button>
                  )}
              </div>
          </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex min-h-0 relative">
          
          {/* SVG Canvas */}
          <div className="flex-1 bg-[#0B1120] relative overflow-hidden">
              <svg width="100%" height="100%" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid meet">
                  <defs>
                      {/* Arrow Heads - Unique IDs to avoid collision */}
                      <marker id="causal-arrow-red" viewBox="0 0 10 10" refX="25" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="#FF4444" />
                      </marker>
                      <marker id="causal-arrow-orange" viewBox="0 0 10 10" refX="25" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="#FF8C00" />
                      </marker>
                      <marker id="causal-arrow-gray" viewBox="0 0 10 10" refX="25" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
                      </marker>
                      
                      {/* Flow Gradients - Simplified for maximum compatibility */}
                      <linearGradient id="causal-flow-red" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#FF4444" stopOpacity="0.95" />
                          <stop offset="100%" stopColor="#FF4444" stopOpacity="0.4" />
                      </linearGradient>
                      <linearGradient id="causal-flow-orange" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#FF8C00" stopOpacity="0.9" />
                          <stop offset="100%" stopColor="#FF8C00" stopOpacity="0.3" />
                      </linearGradient>
                      <linearGradient id="causal-flow-gray" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#475569" stopOpacity="0.5" />
                          <stop offset="100%" stopColor="#475569" stopOpacity="0.1" />
                      </linearGradient>
                      
                      <filter id="causal-glow-gold" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="3" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                      
                      {/* Glow filter for active flux ribbons */}
                      <filter id="causal-glow-red" x="-10%" y="-30%" width="120%" height="160%">
                          <feGaussianBlur stdDeviation="6" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                  </defs>
                  
                  {/* CSS Animations for Flux Mode */}
                  <style>{`
                      @keyframes causal-flow-dash {
                          to { stroke-dashoffset: -40; }
                      }
                      @keyframes causal-ribbon-pulse {
                          0%, 100% { opacity: 0.8; }
                          50% { opacity: 1; }
                      }
                      .causal-flow-line {
                          animation: causal-flow-dash 1.2s linear infinite;
                      }
                      .causal-ribbon-active {
                          animation: causal-ribbon-pulse 2s ease-in-out infinite;
                      }
                  `}</style>





                  {/* Level Columns Background Indicators */}
                  {Object.entries(X_COLS).map(([key, x]) => (
                      <g key={key} opacity={0.05}>
                          <line x1={x} y1={0} x2={x} y2={700} stroke="#FFFFFF" strokeWidth={40} strokeLinecap="round" strokeDasharray="1 15" />
                      </g>
                  ))}

                  {/* Edges */}
                  {treeLinks.map(link => {
                      const isHovered = hoveredLink?.id === link.id;
                      const sourceHovered = hoveredNode && (hoverChains.upstream.has(link.source.id) || link.source.id === hoveredNode.id) && (hoverChains.downstream.has(link.target.id) || link.target.id === hoveredNode.id);
                      const isSelected = selectedNode && (activeChains.upstream.has(link.source.id) || link.source.id === selectedNode) && (activeChains.downstream.has(link.target.id) || link.target.id === selectedNode);
                      
                      let opacity = 1;
                      if (selectedNode && !isSelected) opacity = 0.1;
                      else if (hoveredNode && !sourceHovered) opacity = 0.08;
                      if (isHovered) opacity = 1;

                      let markerId = `url(#causal-arrow-gray)`;
                      if (link.color === '#FF4444') {
                          markerId = `url(#causal-arrow-red)`;
                      } else if (link.color === '#FF8C00') {
                          markerId = `url(#causal-arrow-orange)`;
                      }

                      // Source and target positions
                      const sx = link.source.pos.x, sy = link.source.pos.y;
                      const tx = link.target.pos.x, ty = link.target.pos.y;
                      const cx1 = sx + 80, cy1 = sy;
                      const cx2 = tx - 80, cy2 = ty;

                      if (viewMode === 'flux') {
                          // ═══════════════════════════════════════════════════
                          // FLUX MODE: Draw FILLED RIBBON polygons (no stroke)
                          // This bypasses all browser stroke-width rendering bugs
                          // ═══════════════════════════════════════════════════
                          const safeWeight = Number(link.weight) || 1;
                          const halfW = Math.min(safeWeight * 4 + 2, 20);
                          
                          // Ribbon color based on link status
                          let ribbonColor;
                          if (link.color === '#FF4444') {
                              ribbonColor = 'rgba(255, 0, 0, 0.85)';
                          } else if (link.color === '#FF8C00') {
                              ribbonColor = 'rgba(255, 140, 0, 0.7)';
                          } else {
                              ribbonColor = 'rgba(100, 116, 139, 0.3)';
                          }

                          // Build a closed ribbon shape using two parallel bezier curves
                          const ribbonPath = [
                              `M ${sx} ${sy - halfW}`,
                              `C ${cx1} ${cy1 - halfW}, ${cx2} ${cy2 - halfW}, ${tx} ${ty - halfW}`,
                              `L ${tx} ${ty + halfW}`,
                              `C ${cx2} ${cy2 + halfW}, ${cx1} ${cy1 + halfW}, ${sx} ${sy + halfW}`,
                              `Z`
                          ].join(' ');

                          return (
                              <g key={`flux-${link.id}`} style={{ opacity }}>
                                  {/* Base filled ribbon */}
                                  <path
                                      d={ribbonPath}
                                      fill={ribbonColor}
                                      stroke="none"
                                  >
                                      {link.color === '#FF4444' && (
                                          <animate 
                                              attributeName="opacity" 
                                              values="0.6;1;0.6" 
                                              dur="2s" 
                                              repeatCount="indefinite" 
                                          />
                                      )}
                                  </path>

                                  {/* Animated flow line — Native SVG animation for movement */}
                                  <path 
                                      d={`M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`}
                                      fill="none"
                                      stroke={link.color === '#FF4444' ? 'rgba(255,255,255,0.8)' : link.color === '#FF8C00' ? 'rgba(255,220,150,0.6)' : 'rgba(255,255,255,0.2)'}
                                      strokeWidth={1.5}
                                      strokeDasharray="10 20"
                                  >
                                      <animate 
                                          attributeName="stroke-dashoffset" 
                                          from="30" 
                                          to="0" 
                                          dur={link.color === '#FF4444' ? "1s" : "2s"} 
                                          repeatCount="indefinite" 
                                      />
                                  </path>

                                  {/* Energy Particles — Small circles following the path */}
                                  {link.color === '#FF4444' && (
                                      <circle r="3" fill="#FFFFFF">
                                          <animateMotion 
                                              path={`M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`}
                                              dur="1.5s"
                                              repeatCount="indefinite"
                                          />
                                          <animate 
                                              attributeName="opacity" 
                                              values="0;1;0" 
                                              dur="1.5s" 
                                              repeatCount="indefinite" 
                                          />
                                      </circle>
                                  )}

                                  {/* Invisible interaction path */}
                                  <path 
                                      d={`M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`}
                                      fill="none"
                                      stroke="transparent"
                                      strokeWidth={Math.max(halfW * 2, 20)}
                                      onMouseEnter={() => setHoveredLink(link)}
                                      onMouseLeave={() => setHoveredLink(null)}
                                      onClick={() => alert(`Flux: ${link.source.id} → ${link.target.id}\nPoids: ${safeWeight}\nStatus: ${link.status}`)}
                                      className="cursor-pointer"
                                  />
                              </g>
                          );
                      }

                      // ═══════════════════════════════════════════════
                      // STRUCTURE MODE: Standard stroked lines (works)
                      // ═══════════════════════════════════════════════
                      const structWidth = isSelected ? (Number(link.width) || 1) * 2 : (Number(link.width) || 1);
                      return (
                          <g key={`struct-${link.id}`} style={{ opacity }}>
                              <path 
                                  d={`M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`}
                                  fill="none"
                                  stroke={link.color}
                                  strokeWidth={structWidth}
                                  strokeDasharray={link.dashed ? '4 4' : 'none'}
                                  markerEnd={markerId}
                                  strokeLinecap="butt"
                                  className={link.color === '#FF4444' ? 'animate-pulse' : ''}
                              />
                              {/* Invisible interaction path */}
                              <path 
                                  d={`M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`}
                                  fill="none"
                                  stroke="transparent"
                                  strokeWidth={20}
                                  onMouseEnter={() => setHoveredLink(link)}
                                  onMouseLeave={() => setHoveredLink(null)}
                                  onClick={() => alert(`Relation: ${link.source.id} est prérequis de ${link.target.id}\nStatus: ${link.status}`)}
                                  className="cursor-pointer"
                              />
                          </g>
                      );
                  })}

                  {/* FLUX MODE INDICATOR — Diagnostic visual confirmation */}
                  {viewMode === 'flux' && (
                      <g>
                          <rect x="350" y="10" width="300" height="36" rx="8" fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.4)" strokeWidth="1" />
                          <text x="500" y="34" textAnchor="middle" fontSize="14" fontWeight="900" fill="#818CF8" letterSpacing="4">MODE FLUX ACTIF</text>
                      </g>
                  )}

                  {/* Nodes */}
                  {treeNodes.map(node => {
                      const isHovered = hoveredNode?.id === node.id;
                      const isSelected = selectedNode === node.id;
                      const isLit = litNodes.has(node.id);
                      
                      let opacity = 1;
                      if (selectedNode && !isSelected && !activeChains.upstream.has(node.id) && !activeChains.downstream.has(node.id)) {
                          opacity = 0.2;
                      }

                      const scale = isHovered ? 1.1 : 1;
                      const strokeW = node.score < 3.0 ? 4 : 1;
                      const strokeColor = (isSelected || isLit) ? '#FFFFFF' : '#FFFFFF';
                      
                      return (
                          <g 
                              key={node.id} 
                              transform={`translate(${node.pos.x}, ${node.pos.y}) scale(${scale})`}
                              style={{ opacity, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
                              onClick={() => handleNodeClick(node.id)}
                              onDoubleClick={() => handleNodeDoubleClick(node)}
                              onMouseEnter={() => handleNodeMouseEnter(node)}
                              onMouseLeave={handleNodeMouseLeave}
                              className="cursor-pointer"
                          >
                              {/* Pivot Crown */}
                              {node.isPivot && (
                                  <g>
                                      <circle r={node.radius + 8} fill="none" stroke="#FFD700" strokeWidth={3} strokeDasharray="6 4" filter="url(#causal-glow-gold)" />
                                      <rect x={-20} y={-(node.radius + 24)} width={40} height={14} rx={4} fill="#FF4444" />
                                      <text y={-(node.radius + 14)} textAnchor="middle" fontSize="9" fontWeight="900" fill="#FFFFFF" letterSpacing="1">PIVOT</text>
                                  </g>
                              )}


                              {/* Animation Glow */}
                              {(isLit || (showT0T1 && node.score > node.baseScore)) && (
                                  <circle r={node.radius + 15} fill="#10B981" opacity={0.3} className="animate-ping" />
                              )}

                              {/* Main Circle */}
                              <circle 
                                  r={node.radius} 
                                  fill={node.colorObj.hex} 
                                  stroke={strokeColor} 
                                  strokeWidth={isSelected ? strokeW + 2 : strokeW}
                              />
                              
                              {/* Inner Text */}
                              <text y={-2} textAnchor="middle" fontSize="14" fontWeight="900" fill="#FFFFFF">{node.id}</text>
                              <text y={12} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#FFFFFF" opacity={0.9}>{node.score.toFixed(1)}</text>
                              
                              {/* External Label */}
                              <text y={node.radius + 16} textAnchor="middle" fontSize="10" fontWeight="900" fill="#CBD5E1" letterSpacing="0.5">
                                  {SHORT_LABELS[node.id]}
                              </text>

                              {/* Robustness Badge */}
                              <g transform={`translate(${node.radius * 0.7}, ${-node.radius * 0.7})`}>
                                  <circle r={7} fill="#1E293B" stroke={node.robustnessBadge.color} strokeWidth={2} />
                                  <circle r={3} fill={node.robustnessBadge.color} />
                              </g>
                          </g>
                      );
                  })}
                  {/* Simulation Sliders (inside SVG for correct alignment) */}
                  {isSimulating && treeNodes.map(node => {
                      // Relaxed condition to ensure sliders appear for any node with potential for simulation
                      if (node.baseScore >= 4.5) return null; 
                      return (
                          <foreignObject 
                              key={`sim-${node.id}`}
                              x={node.pos.x + node.radius + 5} 
                              y={node.pos.y - 70} 
                              width={80} 
                              height={140}
                              className="overflow-visible"
                          >
                              <div 
                                  className="flex flex-col items-center bg-slate-900 border border-amber-500/50 p-2.5 rounded-xl backdrop-blur-xl shadow-[0_15px_30px_-5px_rgba(0,0,0,0.6)] gap-1.5 animate-in zoom-in-50 duration-300 select-none"
                                  style={{ width: '60px', pointerEvents: 'auto' }}
                              >
                                  <span className="text-[8px] font-black text-amber-500 uppercase tracking-tighter">Cible</span>
                                  <input 
                                      type="range" 
                                      min="1" 
                                      max="5" 
                                      step="0.1"
                                      value={node.score}
                                      onChange={(e) => handleSimulateChange(node.id, e.target.value)}
                                      className="h-20 w-3 accent-amber-500 appearance-none bg-slate-800 rounded-full cursor-pointer"
                                      style={{ writingMode: 'vertical-lr', direction: 'rtl', width: '12px' }}
                                  />
                                  <span className="text-[10px] font-black text-white bg-slate-800 px-1.5 py-0.5 rounded-md border border-slate-700">
                                      {node.score.toFixed(1)}
                                  </span>
                              </div>
                          </foreignObject>
                      );
                  })}

              </svg>


              {/* Edge Popup (Hover) */}
              {hoveredLink && !hoveredNode && (
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-800/95 backdrop-blur-md text-white p-4 rounded-xl border border-slate-600 shadow-2xl pointer-events-none z-10 w-72">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-700 pb-2">Relation Causale</p>
                      <p className="text-xs font-bold text-white mb-1">
                          <span style={{ color: getNodeColorObj(hoveredLink.source.score).hex }}>{hoveredLink.source.id}</span>
                          {" est prérequis direct de "}
                          <span style={{ color: getNodeColorObj(hoveredLink.target.score).hex }}>{hoveredLink.target.id}</span>
                      </p>
                      <p className="text-[10px] text-slate-300 font-bold mt-2">
                          Score source : {hoveredLink.source.score.toFixed(1)} → <span style={{ color: hoveredLink.color }}>{hoveredLink.status}</span>
                      </p>
                      {hoveredLink.color !== '#555555' && (
                          <p className="text-[9px] text-rose-300 mt-2 italic bg-rose-500/10 p-2 rounded-lg">
                              Impact : {hoveredLink.target.id} ne peut progresser sans amélioration préalable de {hoveredLink.source.id}
                          </p>
                      )}
                  </div>
              )}

              {/* Node Tooltip */}
              {tooltipNode && (
                  <div className="absolute bg-slate-800/95 backdrop-blur-md text-white p-5 rounded-2xl border border-slate-600 shadow-2xl pointer-events-none z-50 w-80"
                       style={{ 
                           left: Math.min(tooltipNode.pos.x + tooltipNode.radius + 20, 700), 
                           top: Math.max(tooltipNode.pos.y - 100, 20) 
                       }}>
                      <div className="flex justify-between items-start mb-3 border-b border-slate-700 pb-3">
                          <div>
                              <span className="text-lg font-black uppercase tracking-wider" style={{ color: tooltipNode.colorObj.hex }}>{tooltipNode.id}</span>
                              <p className="text-xs font-bold text-slate-200 mt-1">{tooltipNode.label}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                              <span className="px-2 py-1 bg-slate-900 rounded text-[9px] font-black uppercase text-slate-300">
                                  {tooltipNode.colorObj.label}
                              </span>
                          </div>
                      </div>
                      
                      <div className="space-y-2 text-[10px]">
                          <div className="flex justify-between font-bold">
                              <span className="text-slate-400">Score composite :</span>
                              <span className="text-white text-[11px]">{tooltipNode.score.toFixed(2)} / 5</span>
                          </div>
                          <div className="flex justify-between items-center bg-slate-900/50 p-1.5 rounded">
                              <span className="text-slate-400 font-bold">Robustesse :</span>
                              <span className="font-black flex items-center gap-2" style={{ color: tooltipNode.robustnessBadge.color }}>
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tooltipNode.robustnessBadge.color }} />
                                  {tooltipNode.robustnessBadge.label}
                              </span>
                          </div>
                          <div className="flex justify-between font-bold pt-2 border-t border-slate-700/50">
                              <span className="text-slate-400">RC bloquées en aval :</span>
                              <span className="text-rose-400 font-black">{tooltipNode.blocked.length}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                              <span className="text-slate-400">Score causal :</span>
                              <span className="text-indigo-400 font-black">{tooltipNode.causalScore.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                              <span className="text-slate-400">Formation associée :</span>
                              <span className="text-white bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
                                  {tooltipNode.formation?.id || 'Aucune'} (IPF: {tooltipNode.ipf}/5)
                              </span>
                          </div>
                      </div>
                  </div>
              )}
          </div>

          {/* --- RIGHT PANEL (CLIC SIMPLE) --- */}
          {selectedNode && (
              <div className="w-80 bg-[#1E293B] border-l border-slate-700 p-6 flex flex-col overflow-y-auto shadow-[-10px_0_20px_rgba(0,0,0,0.2)] animate-in slide-in-from-right-8">
                  {(() => {
                      const node = treeNodes.find(n => n.id === selectedNode);
                      if (!node) return null;
                      return (
                          <>
                              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
                                  <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center font-black text-lg" style={{ color: node.colorObj.hex }}>
                                          {node.id}
                                      </div>
                                      <div>
                                          <p className="text-[10px] font-black text-slate-400 uppercase">Diagnostic Causal</p>
                                          <p className="text-xs font-bold text-white">{SHORT_LABELS[node.id]}</p>
                                      </div>
                                  </div>
                                  <button onClick={() => setSelectedNode(null)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">✕</button>
                              </div>

                              <div className="space-y-6 flex-1">
                                  <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700 space-y-3">
                                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">État de la chaîne</h4>
                                      <div className="flex justify-between items-center text-sm">
                                          <span className="text-slate-300 font-bold">Poids Causal</span>
                                          <span className="font-black text-indigo-400">{Math.round(node.causalScore)} pts</span>
                                      </div>
                                      <p className="text-[10px] text-slate-400 leading-relaxed italic">
                                          Cette compétence bloque la progression de <strong className="text-rose-400">{node.blocked.length} compétences</strong> en aval. Son traitement est prioritaire.
                                      </p>
                                  </div>

                                  <div className="space-y-3">
                                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Target size={12}/> Solutions Catalogue</h4>
                                      {node.formation ? (
                                          <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl cursor-pointer hover:bg-indigo-500/20 transition-all">
                                              <p className="text-xs font-black text-indigo-400 mb-1">{node.formation.id}</p>
                                              <p className="text-[10px] text-slate-300 font-bold mb-3">{node.formation.libelle}</p>
                                              <div className="flex items-center justify-between text-[9px] font-black uppercase text-indigo-500/70">
                                                  <span>IPF : {node.formation.ipf}/5</span>
                                                  <span>Débloque la chaîne</span>
                                              </div>
                                          </div>
                                      ) : (
                                          <div className="p-4 rounded-2xl border border-dashed border-slate-700 text-center">
                                              <p className="text-[10px] text-slate-500 font-bold uppercase">Aucune formation spécifique trouvée</p>
                                          </div>
                                      )}
                                  </div>
                              </div>
                          </>
                      )
                  })()}
              </div>
          )}
      </div>

      {/* --- FOOTER (LÉGENDE & COMPTEUR) --- */}
      <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-[#0F172A] shrink-0">
          <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#8B0000]"/><span className="text-[9px] font-bold text-slate-400 uppercase">Critique</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#CC4400]"/><span className="text-[9px] font-bold text-slate-400 uppercase">Significatif</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#CC8800]"/><span className="text-[9px] font-bold text-slate-400 uppercase">Modéré</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#4A7C00]"/><span className="text-[9px] font-bold text-slate-400 uppercase">Vigilance</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#1A6B1A]"/><span className="text-[9px] font-bold text-slate-400 uppercase">Satisfaisant</span></div>
              </div>

              <div className="h-4 w-px bg-slate-700" />
              <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5"><div className="w-4 h-1 bg-[#FF4444] rounded"/><span className="text-[9px] font-bold text-slate-400 uppercase">Active</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-[#555555] border-t border-dashed border-[#555555]"/><span className="text-[9px] font-bold text-slate-400 uppercase">Fermée</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full border-2 border-[#FFD700]"/><span className="text-[9px] font-bold text-[#FFD700] uppercase">Pivot Absolu</span></div>
              </div>
          </div>
          
          <div className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-4">
              <span><strong className="text-rose-500">{metrics.activeChainsCount}</strong> Chaînes actives</span>
              <span><strong className="text-amber-500">{metrics.deficientNodes}</strong> RC en déficit</span>
              <span><strong className="text-emerald-500">{metrics.satisfactoryNodes}</strong> RC satisfaisantes</span>
          </div>
      </div>
    </div>
  );
}
