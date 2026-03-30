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
          borderRadius: 100,
        }}
      >
        <span style={{ fontSize: 320, fontWeight: 900, color: '#fff', letterSpacing: -10 }}>
          Q
        </span>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
