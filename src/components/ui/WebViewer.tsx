/**
 * In-app web/PDF viewer modal — web only.
 * Uses an <iframe> to render any URL inside the app.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { X, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react-native';
import { useColors } from '../../lib/theme';

interface WebViewerProps {
  url: string;
  title?: string;
  onClose: () => void;
}

export default function WebViewer({ url, title, onClose }: WebViewerProps) {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [key,     setKey]     = useState(0); // used to force iframe reload

  if (Platform.OS !== 'web') return null;

  const reload = () => { setError(false); setLoading(true); setKey(k => k + 1); };

  return (
    // @ts-ignore
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header bar */}
      {/* @ts-ignore */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        backgroundColor: colors.card,
        borderBottom: `1px solid ${colors.border}`,
        flexShrink: 0,
      }}>
        {/* @ts-ignore */}
        <button onClick={onClose} style={{
          width: 34, height: 34, borderRadius: 10, border: `1px solid ${colors.border}`,
          background: colors.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={16} color={colors.text} />
        </button>

        {/* @ts-ignore */}
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title || url}
        </span>

        {/* Reload */}
        {/* @ts-ignore */}
        <button onClick={reload} style={{
          width: 32, height: 32, borderRadius: 9, border: `1px solid ${colors.border}`,
          background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <RefreshCw size={14} color={colors.textSecondary} />
        </button>

        {/* Open in new tab */}
        {/* @ts-ignore */}
        <button onClick={() => window.open(url, '_blank')} style={{
          width: 32, height: 32, borderRadius: 9, border: `1px solid ${colors.border}`,
          background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ExternalLink size={14} color={colors.textSecondary} />
        </button>
      </div>

      {/* iframe area */}
      {/* @ts-ignore */}
      <div style={{ flex: 1, position: 'relative', backgroundColor: '#fff' }}>
        {loading && !error && (
          // @ts-ignore
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            backgroundColor: colors.bg,
          }}>
            {/* @ts-ignore */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: `3px solid ${colors.border}`,
              borderTopColor: colors.primary,
              animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            {/* @ts-ignore */}
            <span style={{ fontSize: 13, color: colors.textSecondary }}>Loading…</span>
          </div>
        )}

        {error && (
          // @ts-ignore
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            backgroundColor: colors.bg,
          }}>
            <AlertCircle size={36} color={colors.error} />
            {/* @ts-ignore */}
            <span style={{ fontSize: 15, fontWeight: 700, color: colors.text }}>Could not load page</span>
            {/* @ts-ignore */}
            <span style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', maxWidth: 320 }}>
              The page may require login or block embedding. Try opening in a new tab instead.
            </span>
            {/* @ts-ignore */}
            <button onClick={() => window.open(url, '_blank')} style={{
              padding: '10px 20px', borderRadius: 12, border: 'none',
              backgroundColor: colors.primary, color: '#fff', fontWeight: 700,
              cursor: 'pointer', fontSize: 14,
            }}>
              Open in New Tab
            </button>
          </div>
        )}

        {/* @ts-ignore */}
        <iframe
          key={key}
          src={url}
          style={{ width: '100%', height: '100%', border: 'none', display: error ? 'none' : 'block' }}
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
          title={title || 'Viewer'}
        />
      </div>
    </div>
  );
}
