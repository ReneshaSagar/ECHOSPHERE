import React from 'react';
import { Calendar } from 'lucide-react';
import { ApplicantRow } from '../ApplicantsClient';

interface DecisionModalProps {
  activeModalApp: ApplicantRow;
  modalStatus: string;
  setModalStatus: (s: string) => void;
  modalStage: string;
  setModalStage: (s: string) => void;
  modalAltRoles: string;
  setModalAltRoles: (s: string) => void;
  modalReason: string;
  setModalReason: (s: string) => void;
  decisionError: string | null;
  isUpdating: boolean;
  onClose: () => void;
  onSaveAndSchedule: () => void;
  onSaveDecision: () => void;
}

export default function DecisionModal({
  activeModalApp,
  modalStatus,
  setModalStatus,
  modalStage,
  setModalStage,
  modalAltRoles,
  setModalAltRoles,
  modalReason,
  setModalReason,
  decisionError,
  isUpdating,
  onClose,
  onSaveAndSchedule,
  onSaveDecision
}: DecisionModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0a0a0d] rounded-3xl max-w-lg w-full p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/[0.1] space-y-6 animate-in fade-in zoom-in-95 font-sans">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-xl font-sans font-bold text-white">
              update candidate decision
            </h3>
            <p className="text-xs font-mono text-white/40">
              candidate: <strong className="text-white">{activeModalApp.name}</strong> · role: <strong className="text-white">{activeModalApp.role}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white font-mono text-base"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-medium text-white/70">Target Decision</label>
            <select
              value={modalStatus}
              onChange={(e) => setModalStatus(e.target.value)}
              className="w-full p-3 bg-[#030304] border border-white/[0.1] rounded-xl text-xs font-mono text-white focus:outline-none focus:border-white/30"
            >
              <option value="SELECTED">✓ Selected / Extend Offer</option>
              <option value="CONSIDER_FOR_OTHER_ROLES">💡 Consider for Other Roles (Talent Pool)</option>
              <option value="REJECTED">✗ Reject Candidate</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-medium text-white/70">Decision Stage</label>
            <select
              value={modalStage}
              onChange={(e) => setModalStage(e.target.value)}
              className="w-full p-3 bg-[#030304] border border-white/[0.1] rounded-xl text-xs font-mono text-white focus:outline-none focus:border-white/30"
            >
              <option value="RESUME_SCREENING">Resume & Profile Screening</option>
              <option value="ROUND_1_TECHNICAL">Technical Architecture (Round 1)</option>
              <option value="ROUND_2_SYSTEM_DESIGN">System Design & Concurrency (Round 2)</option>
              <option value="ROUND_3_BEHAVIORAL">Leadership & Culture (Round 3)</option>
              <option value="FINAL_DECISION">Final Recruiter Panel Review</option>
            </select>
          </div>

          {modalStatus === 'CONSIDER_FOR_OTHER_ROLES' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-medium text-white/70">
                Alternative Roles (comma-separated)
              </label>
              <input
                type="text"
                value={modalAltRoles}
                onChange={(e) => setModalAltRoles(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer, Staff DevOps, Fullstack Architect"
                className="w-full p-3 bg-[#030304] border border-white/[0.1] rounded-xl text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                suppressHydrationWarning
                autoComplete="off"
              />
              <p className="text-[11px] font-mono text-white/40">
                Candidate will be flagged in the talent pool for these matching opportunities.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-medium text-white/70">
              {modalStatus === 'REJECTED' 
                ? 'Rejection Reason / Skill Gaps' 
                : modalStatus === 'SELECTED'
                ? 'Hiring Justification & Key Strengths'
                : 'Notes / Match Rationale'}
            </label>
            <textarea
              value={modalReason}
              onChange={(e) => setModalReason(e.target.value)}
              rows={3}
              placeholder={
                modalStatus === 'REJECTED'
                  ? 'e.g. Lacks required distributed concurrency experience; candidate answered vaguely on Redis caching...'
                  : 'e.g. Exceptional answers on system scalability, verified high commit velocity...'
              }
              className="w-full p-3 bg-[#030304] border border-white/[0.1] rounded-xl text-xs font-sans text-white placeholder-white/30 focus:outline-none focus:border-white/30 leading-relaxed"
            />
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {decisionError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-sans leading-relaxed">
              ⚠️ {decisionError}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-white/[0.1] rounded-full text-xs font-mono text-white/60 hover:text-white transition"
            >
              cancel
            </button>
            {modalStatus === 'SELECTED' && (
              <button
                type="button"
                onClick={onSaveAndSchedule}
                disabled={isUpdating}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-xs font-mono font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{isUpdating ? 'Saving...' : 'Save & Pick Slot →'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onSaveDecision}
              disabled={isUpdating}
              className="px-6 py-2.5 bg-white text-black hover:bg-neutral-200 rounded-full text-xs font-sans font-bold shadow-sm transition disabled:opacity-50"
            >
              {isUpdating ? 'saving...' : 'save decision'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
