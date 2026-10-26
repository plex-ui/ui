import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { lightTheme, theme } from '../theme';
import { TypedText } from '../components/TypedText';

export const SceneCTA: React.FC<{ vertical?: boolean; light?: boolean }> = ({ vertical, light }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleSpring = spring({ frame, fps, config: { damping: 16 } });
  const t = light ? lightTheme : theme;

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        padding: vertical ? 60 : 120,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: vertical ? 72 : 96,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          marginBottom: 24,
          opacity: titleSpring,
          transform: `scale(${interpolate(titleSpring, [0, 1], [0.94, 1])})`,
          background: light
            ? `linear-gradient(135deg, ${t.fg} 0%, ${theme.accent} 100%)`
            : `linear-gradient(135deg, #ffffff 0%, ${theme.accent} 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Plex UI
      </div>
      <div
        style={{
          fontSize: vertical ? 32 : 36,
          color: t.fgMuted,
          marginBottom: 56,
          opacity: interpolate(frame, [10, 25], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        Install in 5 seconds. Ship in 5 minutes.
      </div>

      <div
        style={{
          backgroundColor: t.bgSoft,
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          padding: '20px 32px',
          fontFamily: theme.mono,
          fontSize: vertical ? 26 : 28,
          color: t.fg,
          opacity: interpolate(frame, [20, 40], [0, 1], { extrapolateRight: 'clamp' }),
          marginBottom: 28,
        }}
      >
        <span style={{ color: t.fgMuted }}>$ </span>
        <TypedText text="npm install @plexui/ui" startFrame={30} cps={28} cursor={false} />
      </div>

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 22px',
          borderRadius: 999,
          backgroundColor: light ? 'rgba(4, 184, 76, 0.10)' : 'rgba(4, 184, 76, 0.20)',
          border: light ? '1px solid rgba(4, 184, 76, 0.22)' : '1px solid rgba(4, 184, 76, 0.45)',
          color: light ? '#00692a' : '#8cdfad',
          fontWeight: light ? 500 : 600,
          fontSize: vertical ? 22 : 24,
          fontFamily: t.sans,
          opacity: interpolate(frame, [40, 60], [0, 1], { extrapolateRight: 'clamp' }),
          marginBottom: 36,
        }}
      >
        Free · MIT · 100% open source
      </div>

      <div
        style={{
          fontSize: vertical ? 26 : 28,
          color: t.fgMuted,
          opacity: interpolate(frame, [60, 80], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        plexui.com · github.com/plex-ui/ui · @plex_uikit
      </div>
    </AbsoluteFill>
  );
};
