import { supabase } from './supabaseClient';

const entityToTable = {
  User: 'profiles',
  Category: 'categories',
  Supplier: 'suppliers',
  Location: 'locations',
  InventoryItem: 'inventory_items',
  Recipe: 'recipes',
  ItemHistory: 'item_history',
};

function parseSort(sort) {
  if (!sort) return { column: 'created_at', ascending: false };
  const ascending = !String(sort).startsWith('-');
  const base44Column = String(sort).replace(/^-/, '');
  const column = base44Column === 'created_date' ? 'created_at' : base44Column;
  return { column, ascending };
}

function tableFor(entityName) {
  const table = entityToTable[entityName];
  if (!table) throw new Error(`Unknown entity: ${entityName}`);
  return table;
}

function entity(entityName) {
  const table = tableFor(entityName);

  return {
    async list(sort, limit) {
      const { column, ascending } = parseSort(sort);
      let query = supabase.from(table).select('*').order(column, { ascending });
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },

    async filter(filters = {}, sort, limit) {
      const { column, ascending } = parseSort(sort);
      let query = supabase.from(table).select('*').order(column, { ascending });
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },

    async create(payload) {
      const { data, error } = await supabase.from(table).insert(payload).select().single();
      if (error) throw error;
      return data;
    },

    async update(id, payload) {
      const { data, error } = await supabase.from(table).update(payload).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return true;
    },
  };
}

export const dim = {
  entities: Object.fromEntries(Object.keys(entityToTable).map((name) => [name, entity(name)])),

  auth: {
    async isAuthenticated() {
      const { data } = await supabase.auth.getSession();
      return Boolean(data.session);
    },
    async me() {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const authUser = userData.user;
      if (!authUser) throw new Error('Not authenticated');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
      if (profileError) throw profileError;
      return { ...profile, email: authUser.email };
    },
    async updateMe(payload) {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', userData.user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    async logout(redirectTo = '/') {
      await supabase.auth.signOut();
      if (redirectTo) window.location.href = redirectTo;
    },
    redirectToLogin(redirectTo = window.location.href) {
      const url = new URL('/login', window.location.origin);
      url.searchParams.set('redirectTo', redirectTo);
      window.location.href = url.toString();
    },
  },

  integrations: {
    Core: {
      async UploadFile({ file }) {
        const path = `${crypto.randomUUID()}-${file.name}`;
        const { error } = await supabase.storage.from('item-images').upload(path, file, { upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from('item-images').getPublicUrl(path);
        return { file_url: data.publicUrl };
      },
    },
  },

  users: {
    async inviteUser() {
      throw new Error('Supabase invitation must be implemented server-side with a service role key.');
    },
  },
};
