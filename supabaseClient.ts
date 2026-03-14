import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zrjwslcxbfefzjlgctci.supabase.co';
const supabaseKey = 'sb_publishable_4zXAbAYbwh8NULUJ4QgNKA_GOaOwg8D';

export const supabase = createClient(supabaseUrl, supabaseKey);