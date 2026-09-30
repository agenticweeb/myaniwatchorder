import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const franchise = searchParams.get('franchise') ?? 'Anime';
    const entries = searchParams.get('entries') ?? '?';
    const hours = searchParams.get('hours') ?? '?';
    const tierProfile = searchParams.get('tier') ?? 'Essential';
    const cover = searchParams.get('cover');

    // ── CACHE READ: 24h TTL — first request generates, everything after
    //    (including social platform crawlers) gets instant response.
    //    This is the fix for the 5.9s response time killing thumbnails.
    const cacheKey = `og:${Buffer.from(searchParams.toString()).toString("base64").slice(0, 180)}`;
    try {
      const cached = await redis.get<string>(cacheKey);
      if (cached) {
        return new Response(Buffer.from(cached, "base64"), {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
          },
        });
      }
    } catch {
      // Cache read failure — fall through to generation
    }

    const palette = { primary: '#6366f1', accent: '#818cf8' };
    const titleSize = franchise.length > 26 ? 44 : franchise.length > 16 ? 54 : 64;

    const StatsRow = (
      <div style={{ display: 'flex', gap: '44px', marginTop: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '46px', fontWeight: 700, color: palette.accent }}>{entries}</div>
          <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Entries</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '46px', fontWeight: 700, color: palette.accent }}>{`${hours}h`}</div>
          <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Watch Time</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '46px', fontWeight: 700, color: palette.accent }}>{tierProfile}</div>
          <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tier</div>
        </div>
      </div>
    );

    const Footer = (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '40px' }}>
        <div style={{ display: 'flex', width: '32px', height: '32px', borderRadius: '8px', background: palette.accent, alignItems: 'center', justifyContent: 'center', color: '#0a0a0f', fontWeight: 800, fontSize: '18px' }}>C</div>
        <div style={{ display: 'flex', color: 'rgba(255,255,255,0.6)', fontSize: '16px' }}>aniwatchorder.cc</div>
      </div>
    );

    // ── GENERATE the image
    const imageResponse = cover
      ? new ImageResponse(
          (
            <div style={{ display: 'flex', width: '1200px', height: '630px', background: '#0a0a0f', position: 'relative', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
              <div style={{ display: 'flex', width: '460px', height: '630px', position: 'relative', flexShrink: 0 }}>
                <img src={cover} alt={franchise} style={{ width: '460px', height: '630px', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '180px', background: 'linear-gradient(to right, rgba(10,10,15,0), #0a0a0f)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', padding: '56px 60px', height: '100%', justifyContent: 'space-between', flex: 1, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at top right, ${palette.primary}22, transparent 60%)` }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '17px', color: palette.accent, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '12px' }}>MyAniWatchOrder · Watch Order</div>
                  <div style={{ fontSize: `${titleSize}px`, fontWeight: 800, color: 'white', lineHeight: 1.1, maxWidth: '600px' }}>{franchise}</div>
                </div>
                {StatsRow}
                {Footer}
              </div>
            </div>
          ),
          { width: 1200, height: 630 }
        )
      : new ImageResponse(
          (
            <div style={{ display: 'flex', flexDirection: 'column', width: '1200px', height: '630px', background: '#0a0a0f', position: 'relative', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
              <div style={{ display: 'flex', position: 'absolute', inset: 0, background: `radial-gradient(ellipse at top right, ${palette.primary}22, transparent 60%)` }} />
              <div style={{ display: 'flex', flexDirection: 'column', padding: '60px', height: '100%', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '18px', color: palette.accent, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '12px' }}>MyAniWatchOrder · Watch Order</div>
                  <div style={{ fontSize: `${titleSize}px`, fontWeight: 800, color: 'white', lineHeight: 1.1, maxWidth: '700px' }}>{franchise}</div>
                </div>
                {StatsRow}
                {Footer}
              </div>
            </div>
          ),
          { width: 1200, height: 630 }
        );

    // ── CACHE WRITE: store the generated image as base64, 24h TTL
    try {
      const arrayBuffer = await imageResponse.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      await redis.set(cacheKey, base64, { ex: 86400 });

      return new Response(arrayBuffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
        },
      });
    } catch {
      // Cache write failed — return the ImageResponse directly
      return imageResponse;
    }
  } catch (e) {
    return new ImageResponse(
      (
        <div style={{ display: 'flex', width: '1200px', height: '630px', background: '#0a0a0f', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '48px' }}>
          MyAniWatchOrder Watch Order
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }
}
