import { getSupabase } from './supabase';

export async function requestMap(body, signal) {
  const { data, error } = await getSupabase().functions.invoke('google-maps', { body, signal });
  if (error) {
    let message = 'Could not reach Maps. Check your connection and try again.';
    try { const detail = await error.context?.json(); if (detail?.error) message = detail.error; } catch { /* safe fallback */ }
    throw new Error(message);
  }
  return data;
}
