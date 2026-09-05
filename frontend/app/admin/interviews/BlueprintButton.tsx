"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BlueprintButton({ interviewId, hasBlueprint }: { interviewId: string, hasBlueprint: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const generateBlueprint = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/blueprint`, { method: 'POST' });
      if (res.ok) {
        router.push(`/admin/interviews/${interviewId}/blueprint`);
      } else {
        const data = await res.json();
        alert("Failed to generate blueprint: " + data.error);
        setLoading(false);
      }
    } catch (err) {
      alert("Error: " + err);
      setLoading(false);
    }
  };

  if (hasBlueprint) {
    return (
      <Link 
        href={`/admin/interviews/${interviewId}/blueprint`}
        className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 font-mono text-xs font-bold transition-all inline-flex items-center gap-1"
      >
        <span>View Blueprint</span>
        <span>→</span>
      </Link>
    );
  }

  return (
    <button 
      onClick={generateBlueprint} 
      disabled={loading}
      className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 font-mono text-xs font-bold transition-all disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
    >
      {loading ? (
        <span>Generating...</span>
      ) : (
        <>
          <span>Generate Blueprint</span>
          <span>→</span>
        </>
      )}
    </button>
  );
}

