"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Layers, Database, Cpu, HardDrive, RefreshCw, Zap, CheckCircle2 } from 'lucide-react';

// Dynamic import for Excalidraw to ensure SSR safety in Next.js
const Excalidraw = dynamic(
  () => import('@excalidraw/excalidraw').then((mod) => mod.Excalidraw),
  { ssr: false }
);

interface SystemDesignWorkspaceProps {
  diagramElements: any[];
  setDiagramElements: (els: any[]) => void;
  onSubmit: () => void;
}

export default function SystemDesignWorkspace({
  diagramElements,
  setDiagramElements,
  onSubmit
}: SystemDesignWorkspaceProps) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);

  // Quick-Add Component Helpers
  const addArchitectureNode = (label: string, type: 'gateway' | 'service' | 'cache' | 'queue' | 'db') => {
    if (!excalidrawAPI) return;

    const currentEls = excalidrawAPI.getSceneElements() || [];
    const offsetX = 250 + (currentEls.length % 4) * 160;
    const offsetY = 180 + Math.floor(currentEls.length / 4) * 120;

    const colors: Record<string, string> = {
      gateway: '#3b82f6', // Blue
      service: '#10b981', // Green
      cache: '#f59e0b',   // Amber
      queue: '#8b5cf6',   // Purple
      db: '#ec4899'       // Pink
    };

    const newRect = {
      type: 'rectangle',
      version: 2,
      versionNonce: Date.now(),
      isDeleted: false,
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      fillStyle: 'hachure',
      strokeWidth: 2,
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      angle: 0,
      x: offsetX,
      y: offsetY,
      strokeColor: colors[type] || '#ffffff',
      backgroundColor: 'transparent',
      width: 140,
      height: 70,
      seed: Math.floor(Math.random() * 100000),
      groupIds: [],
      frameId: null,
      roundness: { type: 3 },
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false
    };

    const newText = {
      type: 'text',
      version: 2,
      versionNonce: Date.now(),
      isDeleted: false,
      id: `text_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      fillStyle: 'hachure',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      angle: 0,
      x: offsetX + 15,
      y: offsetY + 25,
      strokeColor: '#ffffff',
      backgroundColor: 'transparent',
      width: 110,
      height: 20,
      seed: Math.floor(Math.random() * 100000),
      groupIds: [],
      frameId: null,
      roundness: null,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
      text: label,
      fontSize: 14,
      fontFamily: 1,
      textAlign: 'center',
      verticalAlign: 'middle',
      containerId: null,
      originalText: label,
      lineHeight: 1.25
    };

    const updated = [...currentEls, newRect, newText];
    excalidrawAPI.updateScene({ elements: updated });
    setDiagramElements(updated);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#1e1e1e] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
      
      {/* System Design Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-gray-800 text-xs gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-gray-400 font-bold uppercase text-[10px] tracking-wider mr-2">Quick Add Architecture Nodes:</span>
          
          <button
            onClick={() => addArchitectureNode('API Gateway', 'gateway')}
            className="px-2.5 py-1 bg-[#1e1e1e] hover:bg-blue-950/40 text-blue-300 border border-blue-500/30 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>API Gateway</span>
          </button>

          <button
            onClick={() => addArchitectureNode('App Service', 'service')}
            className="px-2.5 py-1 bg-[#1e1e1e] hover:bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Microservice</span>
          </button>

          <button
            onClick={() => addArchitectureNode('Redis Cache', 'cache')}
            className="px-2.5 py-1 bg-[#1e1e1e] hover:bg-amber-950/40 text-amber-300 border border-amber-500/30 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Redis Cache</span>
          </button>

          <button
            onClick={() => addArchitectureNode('Kafka Queue', 'queue')}
            className="px-2.5 py-1 bg-[#1e1e1e] hover:bg-purple-950/40 text-purple-300 border border-purple-500/30 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Message Queue</span>
          </button>

          <button
            onClick={() => addArchitectureNode('PostgreSQL DB', 'db')}
            className="px-2.5 py-1 bg-[#1e1e1e] hover:bg-pink-950/40 text-pink-300 border border-pink-500/30 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Database</span>
          </button>
        </div>

        <button
          onClick={onSubmit}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md ml-auto"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Complete System Design</span>
        </button>
      </div>

      {/* Excalidraw Canvas Area */}
      <div className="flex-1 w-full relative min-h-[450px]">
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          onChange={(elements) => setDiagramElements(elements as any[])}
          theme="dark"
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: false,
              clearCanvas: true,
              export: false,
              loadScene: false,
              saveToActiveFile: false,
              toggleTheme: false
            }
          }}
        />
      </div>

    </div>
  );
}
