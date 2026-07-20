import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { errorResponse } from '@/lib/api'

export async function PUT(request: Request) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return errorResponse('Unauthorized', 401)
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser(token)

  if (userError || !user) {
    return errorResponse('Unauthorized', 401)
  }

  const { display_name, bio, avatar_url } = await request.json()

  const { error } = await supabase
    .from('profiles')
    .upsert({ 
      id: user.id, 
      display_name, 
      bio, 
      avatar_url,
      updated_at: new Date().toISOString()
    })

  if (error) {
    return errorResponse(error.message, 500)
  }

  return NextResponse.json({ success: true })
}
