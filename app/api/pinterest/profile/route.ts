import { NextResponse } from 'next/server';

const token = process.env.PINTEREST_ACCESS_TOKEN;

export async function GET() {
  try {
    const res = await fetch('https://api.pinterest.com/v5/user_account', {
      headers: {
        Authorization: Bearer \,
      },
    });

    if (!res.ok) {
      throw new Error(Pinterest API error: \);
    }

    const data = await res.json();
    return NextResponse.json({
      profile: {
        id: data.id,
        username: data.username,
        name: data.name || data.username,
        profile_image: data.profile_image || '',
        website: data.website_url || '',
      },
      source: 'pinterest'
    });
  } catch (error) {
    console.error('Pinterest profile error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
