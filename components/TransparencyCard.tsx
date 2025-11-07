/**
 * Transparency Card Component
 * Displays AI generation parameters and transparency score
 * Shows model, provider, steps, seed, sampler, CFG scale, etc.
 * Calculates transparency score based on available parameters
 */

'use client';

import { useState } from 'react';
import type { TransparencyData, MusicTransparencyData } from '@/lib/ai';

interface TransparencyCardProps {
  transparency: TransparencyData | MusicTransparencyData;
  prompt: string;
}

export default function TransparencyCard({ transparency, prompt }: TransparencyCardProps) {
  const [copied, setCopied] = useState(false);

  // Check if it's image or music transparency data
  const isMusic = 'duration' in transparency && !('width' in transparency);
  
  // Calculate transparency score
  const calculateScore = (): number => {
    if (isMusic) {
      const musicTransparency = transparency as MusicTransparencyData;
      const fields = [
        musicTransparency.model,
        musicTransparency.provider,
        musicTransparency.duration,
        musicTransparency.prompt,
        musicTransparency.timestamp,
      ];
      const filledFields = fields.filter(field => field !== undefined && field !== null).length;
      return Math.round((filledFields / 5) * 100);
    } else {
      const imageTransparency = transparency as TransparencyData;
      const fields = [
        imageTransparency.model,
        imageTransparency.provider,
        imageTransparency.width,
        imageTransparency.height,
        imageTransparency.steps,
        imageTransparency.seed,
        imageTransparency.sampler,
        imageTransparency.cfgScale,
      ];
      const filledFields = fields.filter(field => field !== undefined && field !== null).length;
      return Math.round((filledFields / 8) * 100);
    }
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
    let text = `AI Transparency Report
Model: ${transparency.model}
Provider: ${transparency.provider}`;
    
    if (isMusic) {
      const musicTransparency = transparency as MusicTransparencyData;
      text += `
Duration: ${musicTransparency.duration || 'N/A'} seconds`;
    } else {
      const imageTransparency = transparency as TransparencyData;
      text += `
Resolution: ${imageTransparency.width}×${imageTransparency.height}
${imageTransparency.steps ? `Steps: ${imageTransparency.steps}` : ''}
${imageTransparency.seed ? `Seed: ${imageTransparency.seed}` : ''}
${imageTransparency.sampler ? `Sampler: ${imageTransparency.sampler}` : ''}
${imageTransparency.cfgScale ? `CFG Scale: ${imageTransparency.cfgScale}` : ''}`;
    }
    
    text += `
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
              {isMusic 
                ? (transparency.provider === 'beatoven' ? 'BeatOven AI' : 'Dummy Audio')
                : 'Stability AI'}
            </p>
          </div>
          
          {isMusic ? (
            <>
              {(transparency as MusicTransparencyData).duration && (
                <div>
                  <p className="text-xs text-stone-600 mb-1">Duration</p>
                  <p className="text-sm font-semibold text-stone-800 bg-white/80 p-2 rounded border border-blue-200/50">
                    {(transparency as MusicTransparencyData).duration} seconds
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <p className="text-xs text-stone-600 mb-1">Resolution</p>
                <p className="text-sm font-semibold text-stone-800 bg-white/80 p-2 rounded border border-blue-200/50">
                  {(transparency as TransparencyData).width}×{(transparency as TransparencyData).height}
                </p>
              </div>
              {(transparency as TransparencyData).steps && (
                <div>
                  <p className="text-xs text-stone-600 mb-1">Steps</p>
                  <p className="text-sm font-semibold text-stone-800 bg-white/80 p-2 rounded border border-blue-200/50">
                    {(transparency as TransparencyData).steps}
                  </p>
                </div>
              )}
              {(transparency as TransparencyData).seed && (
                <div>
                  <p className="text-xs text-stone-600 mb-1">Seed</p>
                  <p className="text-sm font-mono text-xs text-stone-800 bg-white/80 p-2 rounded border border-blue-200/50">
                    {(transparency as TransparencyData).seed}
                  </p>
                </div>
              )}
              {(transparency as TransparencyData).sampler && (
                <div>
                  <p className="text-xs text-stone-600 mb-1">Sampler</p>
                  <p className="text-sm font-semibold text-stone-800 bg-white/80 p-2 rounded border border-blue-200/50">
                    {(transparency as TransparencyData).sampler}
                  </p>
                </div>
              )}
              {(transparency as TransparencyData).cfgScale && (
                <div>
                  <p className="text-xs text-stone-600 mb-1">CFG Scale</p>
                  <p className="text-sm font-semibold text-stone-800 bg-white/80 p-2 rounded border border-blue-200/50">
                    {(transparency as TransparencyData).cfgScale}
                  </p>
                </div>
              )}
            </>
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

