import { User, FileText, Github, Linkedin, ExternalLink, Briefcase, Activity } from 'lucide-react';

interface ProfileTabProps {
  application: any;
  candidate: any;
  candidateContext: any;
  job: any;
}

export default function ProfileTab({ application, candidate, candidateContext, job }: ProfileTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Identity Card */}
      <div className="bg-[#0a0a0d] rounded-3xl border border-white/[0.08] p-6 sm:p-8 shadow-[0_0_40px_rgba(0,0,0,0.4)]">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 pb-6 border-b border-white/[0.06]">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center shrink-0">
              <User className="w-7 h-7 text-white/50" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{candidate?.name}</h2>
              {candidateContext?.headline && (
                <p className="text-sm text-cyan-300 mt-1">{candidateContext.headline}</p>
              )}
              <p className="text-xs text-white/50 font-mono mt-1">{candidate?.email}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {candidate?.linkedinUrl && (
                  <a href={candidate.linkedinUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 transition-all text-xs font-medium">
                    <Linkedin className="w-3.5 h-3.5" /> LinkedIn <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                )}
                {candidate?.githubUrl && (
                  <a href={candidate.githubUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 transition-all text-xs font-medium">
                    <Github className="w-3.5 h-3.5" /> GitHub <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                )}
                {candidate?.portfolioUrl && (
                  <a href={candidate.portfolioUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] text-white/70 hover:bg-white/[0.08] transition-all text-xs font-medium">
                    <ExternalLink className="w-3 h-3" /> Portfolio
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-2xl min-w-[200px]">
            <div className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-1">Applying For</div>
            <div className="font-bold text-white">{job?.title}</div>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-white/[0.06] border border-white/[0.12] text-white/90">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              {application.status}
            </div>
          </div>
        </div>

        {/* LinkedIn narrative */}
        {candidateContext?.linkedin && (
          <div className="mt-6 space-y-4">
            <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-cyan-400 flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5" /> LinkedIn Profile
            </h3>
            {candidateContext.linkedin.about && (
              <p className="text-xs text-white/70 bg-[#030304] p-4 rounded-2xl border border-white/[0.06] leading-relaxed">
                {candidateContext.linkedin.about}
              </p>
            )}
            {candidateContext.linkedin.careerProgression && (
              <p className="text-xs text-purple-200/90 bg-purple-950/20 border border-purple-500/20 p-4 rounded-2xl leading-relaxed">
                {candidateContext.linkedin.careerProgression}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Resume */}
      <div className="bg-[#0a0a0d] rounded-3xl border border-white/[0.08] p-6 sm:p-8 shadow-[0_0_40px_rgba(0,0,0,0.4)]">
        <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-white/40 mb-4 flex items-center gap-2">
          <FileText className="w-3.5 h-3.5" /> Resume Extraction
        </h3>
        <pre className="bg-[#030304] p-5 rounded-2xl border border-white/[0.06] text-xs font-mono text-white/70 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
          {application.resumeText || 'No resume text extracted.'}
        </pre>
        {application.relevantExperience && (
          <div className="mt-4 p-4 bg-cyan-950/20 border border-cyan-500/20 rounded-2xl text-xs text-cyan-100/90 leading-relaxed">
            <div className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider mb-2">⚡ Relevant Experience Highlight</div>
            {application.relevantExperience}
          </div>
        )}
      </div>

      {/* GitHub */}
      {(candidateContext?.githubContext || candidateContext?.githubProjects) && (
        <div className="bg-[#0a0a0d] rounded-3xl border border-white/[0.08] p-6 sm:p-8 shadow-[0_0_40px_rgba(0,0,0,0.4)]">
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-white/40 mb-4 flex items-center gap-2">
            <Github className="w-3.5 h-3.5" /> GitHub Engineering Profile
          </h3>
          {candidateContext.githubContext && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Total Commits', value: candidateContext.githubContext.totalCommits ?? 'N/A', color: 'text-cyan-300', border: 'border-cyan-500/20' },
                { label: 'Past 30 Days', value: candidateContext.githubContext.recentCommits30Days ?? 'N/A', color: 'text-emerald-300', border: 'border-emerald-500/20' },
                { label: 'Public Repos', value: candidateContext.githubContext.publicReposCount ?? 'N/A', color: 'text-amber-300', border: 'border-amber-500/20' },
                { label: 'Pinned Projects', value: candidateContext.githubProjects?.filter((p: any) => p.isPinned).length ?? 0, color: 'text-purple-300', border: 'border-purple-500/20' },
              ].map(({ label, value, color, border }) => (
                <div key={label} className={`bg-[#030304] border ${border} p-4 rounded-2xl text-center`}>
                  <div className={`text-xl font-bold font-mono ${color}`}>{value}</div>
                  <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-white/40 mt-1">{label}</div>
                </div>
              ))}
            </div>
          )}
          {candidateContext.githubProjects?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {candidateContext.githubProjects.map((p: any, i: number) => (
                <div key={i} className="p-4 bg-[#030304] border border-white/[0.08] hover:border-white/20 transition-all rounded-2xl">
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <a href={p.url} target="_blank" rel="noreferrer" className="font-bold text-sm text-cyan-400 hover:underline">{p.name}</a>
                      {p.isPinned && <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full font-mono text-[10px] font-bold border border-purple-500/30">📌 Pinned</span>}
                      {p.isRecent && <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full font-mono text-[10px] border border-emerald-500/30">🕒 Active</span>}
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[10px] text-white/50">
                      {p.candidateCommits > 0 && <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-300 rounded-full border border-cyan-500/20">⚡ {p.candidateCommits}</span>}
                      {p.language && <span className="px-2 py-0.5 bg-white/[0.05] text-white/60 rounded-full border border-white/[0.08]">{p.language}</span>}
                      {p.stars > 0 && <span>⭐ {p.stars}</span>}
                    </div>
                  </div>
                  {p.description && <p className="text-xs text-white/60 mb-2 leading-relaxed">{p.description}</p>}
                  {p.keyInsights && (
                    <p className="text-[11px] text-amber-200/90 bg-amber-950/20 border border-amber-500/20 p-2.5 rounded-xl italic">💡 {p.keyInsights}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cross-Source Correlation */}
      {candidateContext?.crossSourceContext && (
        <div className="bg-[#0a0a0d] rounded-3xl border border-purple-500/20 p-6 sm:p-8 shadow-[0_0_30px_rgba(168,85,247,0.08)]">
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-purple-400 mb-1 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" /> Cross-Source Corroboration
          </h3>
          <p className="text-xs text-white/40 mb-5">Skills & experience verified across Resume + LinkedIn + GitHub</p>
          {candidateContext.crossSourceContext.corroboratedSkills?.length > 0 && (
            <div className="mb-5">
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40 mb-2">Verified Skills</h4>
              <div className="flex flex-wrap gap-2">
                {candidateContext.crossSourceContext.corroboratedSkills.map((s: any, i: number) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-950/20 text-purple-200 border border-purple-500/20 rounded-xl text-xs">
                    {s.skill}
                    <span className="font-mono text-[9px] bg-purple-500/20 px-1.5 py-0.5 rounded font-bold text-purple-300">{s.sources.join('+')}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {candidateContext.crossSourceContext.notableClaims?.length > 0 && (
            <div>
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 mb-2">Notable Claims to Probe</h4>
              <ul className="space-y-2">
                {candidateContext.crossSourceContext.notableClaims.map((c: any, i: number) => (
                  <li key={i} className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-2xl text-xs">
                    <span className="font-semibold text-amber-200">"{c.claim}"</span>
                    <div className="text-[11px] text-amber-300/80 mt-1 font-mono"><strong>Probe: </strong>{c.verificationFocus}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
