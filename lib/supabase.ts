import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const createServerClient = (cookies: any) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookies.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        cookies.set(name, value, options)
      },
      remove(name: string, options: any) {
        cookies.set(name, '', { ...options, maxAge: 0 })
      },
    },
  })
}
