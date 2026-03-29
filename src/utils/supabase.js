import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

/**
 * Increment a specific feature count in the feature_usage table.
 * Falls back to localStorage if Supabase is unreachable.
 * @param {'visits' | 'tts' | 'stt'} featureColumn The column to increment
 */
export const incrementFeatureCount = async (featureColumn) => {
    // Always update localStorage as a local backup
    const localCount = parseInt(localStorage.getItem(featureColumn)) || 0;
    localStorage.setItem(featureColumn, localCount + 1);

    if (!supabase) {
        console.warn(`⚠️ Supabase env variables missing. Used localStorage fallback for "${featureColumn}".`);
        return;
    }

    try {
        // Fetch current count from Supabase
        const { data, error: fetchError } = await supabase
            .from('feature_usage')
            .select(featureColumn)
            .eq('id', 1)
            .single();

        if (fetchError) throw fetchError;

        const currentCount = data[featureColumn] || 0;

        // Update with incremented count
        const { error: updateError } = await supabase
            .from('feature_usage')
            .update({ [featureColumn]: currentCount + 1 })
            .eq('id', 1);

        if (updateError) throw updateError;

        console.log(`✅ Incremented ${featureColumn} in Supabase: ${currentCount + 1}`);
    } catch (err) {
        // Supabase failed but localStorage is already updated above
        console.warn(`⚠️ Supabase update failed for "${featureColumn}", using localStorage fallback.`, err.message);
    }
};
