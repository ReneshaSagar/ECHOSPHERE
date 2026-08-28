'use client';
import { motion } from 'framer-motion';
import type { DynamicPersona } from '@/lib/types';

interface Props {
  persona: DynamicPersona;
  isActive: boolean;
  isThinking: boolean;
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function AvatarCard({ persona, isActive, isThinking }: Props) {
  const initials = getInitials(persona.name);

  return (
    <div
      className={`meet-card flex flex-col items-center justify-center gap-3 p-4 ${isActive ? 'active' : ''}`}
      style={isActive ? { borderColor: persona.color } : {}}
    >
      {/* Avatar circle */}
      <div className="relative">
        <motion.div
          className={isActive ? 'speaking-ring' : ''}
          animate={isActive ? { scale: [1, 1.03, 1] } : { scale: 1 }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: `${persona.color}22`,
              border: `2px solid ${persona.color}55`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: persona.color,
              letterSpacing: '-0.03em',
              boxShadow: isActive ? `0 0 0 3px ${persona.color}33, 0 0 20px ${persona.color}22` : 'none',
              transition: 'box-shadow 0.3s ease',
            }}
          >
            {initials}
          </div>
        </motion.div>

        {/* Speaking / thinking indicator */}
        {(isActive || isThinking) && (
          <div
            style={{
              position: 'absolute',
              bottom: 2,
              right: 2,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: isActive ? persona.color : 'rgba(255,255,255,0.3)',
              border: '2px solid var(--bg-2)',
            }}
            className={isThinking ? 'thinking-blink' : ''}
          />
        )}
      </div>

      {/* Name + role */}
      <div className="text-center">
        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
          {persona.name}
        </p>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
          {persona.role}
        </p>
      </div>

      {/* Status label */}
      {isActive && (
        <div
          className="pill"
          style={{
            background: `${persona.color}18`,
            color: persona.color,
            border: `1px solid ${persona.color}33`,
            fontSize: '0.65rem',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: persona.color }} />
          Speaking
        </div>
      )}
      {isThinking && !isActive && (
        <p style={{ fontSize: '0.65rem', color: 'var(--text-subtle)' }} className="thinking-blink">thinking…</p>
      )}
    </div>
  );
}
