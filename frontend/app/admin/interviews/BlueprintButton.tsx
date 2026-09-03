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
        className="text-green-600 hover:underline font-medium text-sm"
      >
        View Blueprint →
      </Link>
    );
  }

  return (
    <button 
      onClick={generateBlueprint} 
      disabled={loading}
      className="text-blue-600 hover:underline font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Generating...' : 'Generate Blueprint →'}
    </button>
  );
}
