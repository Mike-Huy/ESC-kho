import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tgjsidrlxsiooseshddo.supabase.co';
const supabaseKey = 'sb_publishable_GXVoT6UJQkbpn9gKZh_DTg_xgE4kv44';

export const supabase = createClient(supabaseUrl, supabaseKey);