import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  "https://gsgtbcnajbfocwyzvdjg.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZ3RiY25hamJmb2N3eXp2ZGpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzOTE0NTMsImV4cCI6MjA4ODk2NzQ1M30.-cLKr-_77h7yWqPh12eFalvEVtmBDsU7M39sOgMzgqg"  // paste your full anon key here
)