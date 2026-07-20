import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api';
import { pinterestFetch } from '@/lib/pinterest';

export async function GET() {
  try {
    const data = await pinterestFetch('user_account');
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
    return errorResponse('Failed to fetch profile', 500);
  }
}
