/**
 * Jan Aushadhi Finder — Supabase Database Module
 * Persistent storage for users, reminders, analytics, and favorites via Supabase/PostgreSQL.
 */

const { createClient } = require('@supabase/supabase-js');

// Resolve Supabase credentials from environment
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[DB] Supabase credentials missing. Database operations will fail.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

const dbHelpers = {
  // ── Users ──
  async findUserByEmail(email) {
    const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
    if (error && error.code !== 'PGRST116') console.error('[DB] findUserByEmail error:', error.message);
    return data;
  },
  async findUserByPhone(phone) {
    const { data, error } = await supabase.from('users').select('*').eq('phone', phone).single();
    if (error && error.code !== 'PGRST116') console.error('[DB] findUserByPhone error:', error.message);
    return data;
  },
  async findUserById(id) {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') console.error('[DB] findUserById error:', error.message);
    return data;
  },
  async createUser({ name, email, phone, password_hash, role = 'user' }) {
    const { data, error } = await supabase.from('users').insert([{
      name: name || null,
      email: email || null,
      phone: phone || null,
      password_hash: password_hash || null,
      role,
    }]).select().single();
    if (error) throw error;
    return data;
  },
  async getUserCount() {
    const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
    if (error) return 0;
    return count;
  },

  // ── Reminders ──
  async getRemindersByUser(userId) {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', String(userId))
      .order('created_at', { ascending: false });
    if (error) return [];
    
    // Map snake_case to camelCase for the frontend if needed
    return data.map(r => ({
      id: r.id,
      userId: r.user_id,
      medicineName: r.medicine_name,
      genericName: r.generic_name,
      dosage: r.dosage,
      frequency: r.frequency,
      nextRefillDate: r.next_refill_date,
      notes: r.notes,
      active: r.active,
      createdAt: r.created_at
    }));
  },
  async createReminder({ user_id, medicine_name, generic_name, dosage, frequency, next_refill_date, notes }) {
    const { data, error } = await supabase.from('reminders').insert([{
      user_id: String(user_id),
      medicine_name,
      generic_name: generic_name || '',
      dosage,
      frequency,
      next_refill_date,
      notes: notes || '',
    }]).select().single();
    if (error) throw error;
    
    return {
      id: data.id,
      userId: data.user_id,
      medicineName: data.medicine_name,
      genericName: data.generic_name,
      dosage: data.dosage,
      frequency: data.frequency,
      nextRefillDate: data.next_refill_date,
      notes: data.notes,
      active: data.active,
      createdAt: data.created_at
    };
  },
  async updateReminder(id, userId, updates) {
    const dbUpdates = {};
    if (updates.medicineName !== undefined) dbUpdates.medicine_name = updates.medicineName;
    if (updates.genericName !== undefined) dbUpdates.generic_name = updates.genericName;
    if (updates.dosage !== undefined) dbUpdates.dosage = updates.dosage;
    if (updates.frequency !== undefined) dbUpdates.frequency = updates.frequency;
    if (updates.nextRefillDate !== undefined) dbUpdates.next_refill_date = updates.nextRefillDate;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.active !== undefined) dbUpdates.active = updates.active;

    const { data, error } = await supabase
      .from('reminders')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', String(userId))
      .select()
      .single();
    if (error) return null;
    return data;
  },
  async deleteReminder(id, userId) {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id)
      .eq('user_id', String(userId));
    return !error;
  },
  async getReminderCount() {
    const { count, error } = await supabase.from('reminders').select('*', { count: 'exact', head: true });
    if (error) return 0;
    return count;
  },

  // ── Analytics ──
  async incrementAnalytic(key) {
    // Supabase RPC for incrementing value
    const { error } = await supabase.rpc('increment_analytic', { key_name: key });
    if (error) {
      // Fallback if RPC not set: Fetch then Update
      const { data } = await supabase.from('analytics').select('value').eq('key', key).single();
      if (data) {
        await supabase.from('analytics').update({ value: data.value + 1 }).eq('key', key);
      }
    }
  },
  async getAnalytics() {
    const { data, error } = await supabase.from('analytics').select('*');
    if (error) return {};
    const result = {};
    data.forEach(row => result[row.key] = row.value);
    return result;
  },

  // ── Favorites ──
  async addFavorite(userId, medicineId) {
    await supabase.from('favorites').upsert([{ user_id: userId, medicine_id: medicineId }], { onConflict: 'user_id, medicine_id' });
  },
  async removeFavorite(userId, medicineId) {
    await supabase.from('favorites').delete().eq('user_id', userId).eq('medicine_id', medicineId);
  },
  async getFavorites(userId) {
    const { data, error } = await supabase.from('favorites').select('medicine_id').eq('user_id', userId);
    if (error) return [];
    return data.map(r => r.medicine_id);
  },
  async isFavorite(userId, medicineId) {
    const { data, error } = await supabase.from('favorites').select('id').eq('user_id', userId).eq('medicine_id', medicineId).single();
    return !!data;
  },

  // ── Search History ──
  async addSearchHistory(userId, query, resultsCount) {
    await supabase.from('search_history').insert([{ user_id: userId || 'anonymous', query, results_count: resultsCount }]);
  },
  async getSearchHistory(userId) {
    const { data, error } = await supabase
      .from('search_history')
      .select('query, results_count, created_at')
      .eq('user_id', userId || 'anonymous')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) return [];
    return data;
  },

  // ── Stores ──
  async getAllStores() {
    const { data, error } = await supabase.from('stores').select('*');
    if (error) return [];
    return data;
  },
};

console.log(`[DB] Supabase integration initialized.`);

module.exports = { supabase, ...dbHelpers };
