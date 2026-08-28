'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Play, Mic, Brain, Zap, Shield, BarChart3, Users } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-white dark:bg-midnight">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20 dark:opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-cyan-500 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute top-[20%] right-[-5%] w-96 h-96 bg-amber-500 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-emerald-500 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-7xl mx-auto px-6 z-10">
        
        {/* Hero Section */}
        <motion.section 
          className="text-center py-20 flex flex-col items-center"
          initial="hidden" animate="visible" variants={fadeInUp}
        >
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-400">
            OmniPanel AI
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-10 max-w-3xl">
            Experience the future of hiring with an autonomous, multi-persona voice interview panel.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/setup">
              <button className="flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black font-semibold hover:bg-gray-100 transition-all">
                Start Interview <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <button className="flex items-center gap-2 px-8 py-4 rounded-full border border-gray-300 dark:border-gray-700 bg-transparent text-gray-800 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
              <Play className="w-5 h-5" /> View Demo
            </button>
          </div>
        </motion.section>

        {/* Persona Showcase */}
        <motion.section 
          className="py-16 w-full"
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
        >
          <h2 className="text-3xl font-bold text-center mb-12">Meet Your Panel</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mx-auto">
            {/* Alex */}
            <motion.div whileHover={{ y: -5 }} className="glass rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-persona-alex"></div>
              <h3 className="text-2xl font-bold text-persona-alex mb-1">Alex</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-medium uppercase tracking-wider">Technical Lead</p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3"><Zap className="w-5 h-5 text-persona-alex" /> <span className="text-sm">System Design</span></li>
                <li className="flex items-center gap-3"><Brain className="w-5 h-5 text-persona-alex" /> <span className="text-sm">Architecture</span></li>
                <li className="flex items-center gap-3"><BarChart3 className="w-5 h-5 text-persona-alex" /> <span className="text-sm">Problem Solving</span></li>
              </ul>
            </motion.div>
            
            {/* Maya */}
            <motion.div whileHover={{ y: -5 }} className="glass rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-persona-maya"></div>
              <h3 className="text-2xl font-bold text-persona-maya mb-1">Maya</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-medium uppercase tracking-wider">Product Manager</p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3"><Users className="w-5 h-5 text-persona-maya" /> <span className="text-sm">User Empathy</span></li>
                <li className="flex items-center gap-3"><Mic className="w-5 h-5 text-persona-maya" /> <span className="text-sm">Communication</span></li>
                <li className="flex items-center gap-3"><Shield className="w-5 h-5 text-persona-maya" /> <span className="text-sm">Leadership</span></li>
              </ul>
            </motion.div>

            {/* David */}
            <motion.div whileHover={{ y: -5 }} className="glass rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-persona-david"></div>
              <h3 className="text-2xl font-bold text-persona-david mb-1">David</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-medium uppercase tracking-wider">Engineering Manager</p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3"><Brain className="w-5 h-5 text-persona-david" /> <span className="text-sm">Behavioral</span></li>
                <li className="flex items-center gap-3"><Users className="w-5 h-5 text-persona-david" /> <span className="text-sm">Team Fit</span></li>
                <li className="flex items-center gap-3"><BarChart3 className="w-5 h-5 text-persona-david" /> <span className="text-sm">Conflict Resolution</span></li>
              </ul>
            </motion.div>
          </div>
        </motion.section>

        {/* How it works */}
        <motion.section 
          className="py-16 w-full max-w-4xl text-center"
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
        >
          <h2 className="text-3xl font-bold mb-10">How it Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass p-6 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
              <h4 className="font-semibold mb-2">Upload Details</h4>
              <p className="text-sm text-gray-400">Provide the job description and candidate resume to setup the context.</p>
            </div>
            <div className="glass p-6 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
              <h4 className="font-semibold mb-2">Live Interview</h4>
              <p className="text-sm text-gray-400">Join the voice room. The AI panel drives the conversation organically.</p>
            </div>
            <div className="glass p-6 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
              <h4 className="font-semibold mb-2">Get Report</h4>
              <p className="text-sm text-gray-400">Receive a comprehensive radar chart and scorecard evaluation.</p>
            </div>
          </div>
        </motion.section>

      </main>

      <footer className="w-full py-6 text-center text-sm text-gray-500 z-10 border-t border-gray-200 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-md">
        Built for EchoSphere: Agora Conversational AI Hackathon
      </footer>
    </div>
  );
}
