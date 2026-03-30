import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
          borderRadius: 38,
        }}
      >
        <span style={{ fontSize: 120, fontWeight: 900, color: '#fff', letterSpacing: -4 }}>
          Q
        </span>
      </div>
    ),
    { width: 192, height: 192 },
  );
}
