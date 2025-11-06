/**
 * Transparency Card Component
 * Displays AI generation parameters and transparency score
 * Shows model, provider, steps, seed, sampler, CFG scale, etc.
 * Calculates transparency score based on available parameters
 */

'use client';

import { useState } from 'react';
import type { TransparencyData } from '@/lib/ai';

interface TransparencyCardProps {
  transparency: TransparencyData;
  prompt: string;
}

export default function TransparencyCard({ transparency, prompt }: TransparencyCardProps) {
  const [copied, setCopied] = useState(false);

  // Calculate transparency score
  const calculateScore = (): number => {
    const fields = [
      transparency.model,
      transparency.provider,
      transparency.width,
      transparency.height,
      transparency.steps,
      transparency.seed,
      transparency.sampler,
      transparency.cfgScale,
    ];
    
    const filledFields = fields.filter(field => field !== undefined && field !== null).length;
    const totalFields = 8;
    
    return Math.round((filledFields / totalFields) * 100);
  };

  const score = calculateScore();
  const getScoreColor = () => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getScoreBadge = () => {
    if (score >= 90) return '🟢';
    if (score >= 70) return '🟡';
    return '🟠';
  };

  const copyToClipboard = () => {
    const text = `AI Transparency Report
Model: ${transparency.model}
Provider: ${transparency.provider}
Resolution: ${transparency.width}×${transparency.height}
${transparency.steps ? `Steps: ${transparency.steps}` : ''}
${transparency.seed ? `Seed: ${transparency.seed}` : ''}
${transparency.sampler ? `Sampler: ${transparency.sampler}` : ''}
${transparency.cfgScale ? `CFG Scale: ${transparency.cfgScale}` : ''}
Prompt: ${prompt}
Timestamp: ${new Date(transparency.timestamp).toISOString()}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50/90 to-purple-50/90 rounded-xl shadow-lg p-6 border-2 border-blue-300/50 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
          AI Transparency Report
        </h3>
        <button
          onClick={copyToClipboard}
          className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-lg transition-colors"
        >
          {copied ? '✓ Copied!' : '📋 Copy'}
        </button>
      </div>

      <div className="space-y-3 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-stone-600 mb-1">Model</p>
            <p className="text-sm font-semibold text-stone-800 bg-white/80 p-2 rounded border border-blue-200/50">
              {transparency.model}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-600 mb-1">Provider</p>
            <p className="text-sm font-semibold text-stone-800 bg-white/80 p-2 rounded border border-blue-200/50">
              {transparency.provider === 'stability' ? 'Stability AI' : 'OpenAI'}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-600 mb-1">Resolution</p>
            <p className="text-sm font-semibold text-stone-800 bg-white/80 p-2 rounded border border-blue-200/50">
              {transparency.width}×{transparency.height}
            </p>
          </div>
          {transparency.steps && (
            <div>
              <p className="text-xs text-stone-600 mb-1">Steps</p>
              <p className="text-sm font-semibold text-stone-800 bg-white/80 p-2 rounded border border-blue-200/50">
                {transparency.steps}
              </p>
            </div>
          )}
          {transparency.seed && (
            <div>
              <p className="text-xs text-stone-600 mb-1">Seed</p>
              <p className="text-sm font-mono text-xs text-stone-800 bg-white/80 p-2 rounded border border-blue-200/50">
                {transparency.seed}
              </p>
            </div>
          )}
          {transparency.sampler && (
            <div>
              <p className="text-xs text-stone-600 mb-1">Sampler</p>
              <p className="text-sm font-semibold text-stone-800 bg-white/80 p-2 rounded border border-blue-200/50">
                {transparency.sampler}
              </p>
            </div>
          )}
          {transparency.cfgScale && (
            <div>
              <p className="text-xs text-stone-600 mb-1">CFG Scale</p>
              <p className="text-sm font-semibold text-stone-800 bg-white/80 p-2 rounded border border-blue-200/50">
                {transparency.cfgScale}
              </p>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs text-stone-600 mb-1">Prompt</p>
          <p className="text-sm text-stone-700 bg-white/80 p-2 rounded border border-blue-200/50">
            {prompt}
          </p>
        </div>

        <div>
          <p className="text-xs text-stone-600 mb-1">Generated At</p>
          <p className="text-xs text-stone-700 bg-white/80 p-2 rounded border border-blue-200/50">
            {new Date(transparency.timestamp).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-blue-200/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-600 mb-1">Transparency Score</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getScoreBadge()}</span>
              <span className={`text-2xl font-bold ${getScoreColor()}`}>
                {score}%
              </span>
            </div>
          </div>
          <div className="w-32 h-3 bg-stone-200 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${score}%`,
                backgroundColor: score >= 90 ? '#10b981' : score >= 70 ? '#f59e0b' : '#f97316',
              }}
            />
          </div>
        </div>
        <p className="text-xs text-stone-600 mt-2">
          {score >= 90 
            ? '✅ Full transparency - All parameters recorded'
            : score >= 70 
            ? '⚠️ Good transparency - Most parameters available'
            : '🔴 Limited transparency - Some parameters missing'}
        </p>
      </div>
    </div>
  );
}

