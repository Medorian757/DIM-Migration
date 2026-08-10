import { supabase } from "./supabaseClient";

const entityToTable = {
  User: "profiles",
  Category: "categories",
  Supplier: "suppliers",
  Location: "locations",
  InventoryItem: "inventory_items",
  Recipe: "recipes",
  ItemHistory: "item_history",
};

const organizationOwnedEntities = new Set([
  "Category",
  "Supplier",
  "Location",
  "InventoryItem",
  "Recipe",
  "ItemHistory",
]);

function parseSort(sort) {
  if (!sort) {
    return {
      column: "created_at",
      ascending: false,
    };
  }

  const ascending = !String(sort).startsWith("-");
  const base44Column = String(sort).replace(/^-/, "");

  return {
    column:
      base44Column === "created_date"
        ? "created_at"
        : base44Column,
    ascending,
  };
}

function tableFor(entityName) {
  const table = entityToTable[entityName];

  if (!table) {
    throw new Error(`Unknown entity: ${entityName}`);
  }

  return table;
}

async function getAuthenticatedUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error("Not authenticated");
  }

  return user;
}

async function getCurrentProfile() {
  const authUser = await getAuthenticatedUser();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (error) {
    throw error;
  }

  if (!profile) {
    throw new Error("User profile not found");
  }

  return {
    ...profile,
    email: authUser.email,
  };
}

async function getCurrentOrganizationId() {
  const profile = await getCurrentProfile();

  if (!profile.organization_id) {
    throw new Error(
      "Your account is not assigned to a dental office."
    );
  }

  return profile.organization_id;
}

async function requireSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session) {
    throw new Error("Not authenticated");
  }

  return session;
}

async function addOrganizationToPayload(entityName, payload) {
  if (!organizationOwnedEntities.has(entityName)) {
    return {
      ...payload,
    };
  }

  const organizationId = await getCurrentOrganizationId();

  return {
    ...payload,
    organization_id: organizationId,
  };
}

function removeProtectedFields(entityName, payload) {
  const safePayload = {
    ...payload,
  };

  if (organizationOwnedEntities.has(entityName)) {
    delete safePayload.organization_id;
  }

  if (entityName === "User") {
    delete safePayload.id;
    delete safePayload.organization_id;
  }

  return safePayload;
}

function entity(entityName) {
  const table = tableFor(entityName);

  return {
    async list(sort, limit) {
      const { column, ascending } = parseSort(sort);

      let query = supabase
        .from(table)
        .select("*")
        .order(column, { ascending });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data ?? [];
    },

    async filter(filters = {}, sort, limit) {
      const { column, ascending } = parseSort(sort);

      let query = supabase
        .from(table)
        .select("*")
        .order(column, { ascending });

      Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          return;
        }

        query = query.eq(key, value);
      });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data ?? [];
    },

    async create(payload) {
      const insertPayload = await addOrganizationToPayload(
        entityName,
        payload
      );

      const { data, error } = await supabase
        .from(table)
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },

    async update(id, payload) {
      const updatePayload = removeProtectedFields(
        entityName,
        payload
      );

      const { data, error } = await supabase
        .from(table)
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },

    async delete(id) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      return true;
    },
  };
}

export const dim = {
  entities: Object.fromEntries(
    Object.keys(entityToTable).map((name) => [
      name,
      entity(name),
    ])
  ),

  auth: {
    async isAuthenticated() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      return Boolean(session);
    },

    async me() {
      return getCurrentProfile();
    },

    async updateMe(payload) {
      const authUser = await getAuthenticatedUser();

      const safePayload = {
        ...payload,
      };

      // Users cannot change their own protected fields.
      delete safePayload.id;
      delete safePayload.email;
      delete safePayload.role;
      delete safePayload.organization_id;

      const { data, error } = await supabase
        .from("profiles")
        .update(safePayload)
        .eq("id", authUser.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },

    async logout(redirectTo = "/") {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      if (redirectTo) {
        window.location.href = redirectTo;
      }
    },

    redirectToLogin(redirectTo = window.location.href) {
      const url = new URL(
        "/login",
        window.location.origin
      );

      url.searchParams.set(
        "redirectTo",
        redirectTo
      );

      window.location.href = url.toString();
    },
  },

  integrations: {
    Core: {
      async UploadFile({ file }) {
        if (!file) {
          throw new Error("No file was provided.");
        }

        const organizationId =
          await getCurrentOrganizationId();

        const safeFileName = file.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        );

        const path =
          `${organizationId}/` +
          `${crypto.randomUUID()}-` +
          safeFileName;

        const { error: uploadError } =
          await supabase.storage
            .from("item-images")
            .upload(path, file, {
              upsert: false,
            });

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage
          .from("item-images")
          .getPublicUrl(path);

        return {
          file_url: data.publicUrl,
        };
      },
    },
  },

  users: {
    async inviteUser({ email, role = "user" }) {
      await requireSession();

      const normalizedEmail = String(email || "")
        .trim()
        .toLowerCase();

      const normalizedRole = String(role || "user")
        .trim()
        .toLowerCase();

      if (!normalizedEmail || !normalizedEmail.includes("@")) {
        throw new Error(
          "Enter a valid email address."
        );
      }

      if (
        normalizedRole !== "user" &&
        normalizedRole !== "admin"
      ) {
        throw new Error(
          "Role must be either user or admin."
        );
      }

      const { data, error } =
        await supabase.functions.invoke(
          "invite-user",
          {
            body: {
              email: normalizedEmail,
              role: normalizedRole,
            },
          }
        );

      if (error) {
        throw new Error(
          error.message ||
            "The invitation could not be sent."
        );
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },

    async deleteUser(userId) {
      await requireSession();

      const normalizedUserId = String(
        userId || ""
      ).trim();

      if (!normalizedUserId) {
        throw new Error(
          "A valid user ID is required."
        );
      }

      const { data, error } =
        await supabase.functions.invoke(
          "delete-user",
          {
            body: {
              userId: normalizedUserId,
            },
          }
        );

      if (error) {
        throw new Error(
          error.message ||
            "The user could not be deleted."
        );
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },
  },
};