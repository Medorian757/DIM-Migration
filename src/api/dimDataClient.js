import { supabase } from "./supabaseClient";

const SELECTED_ORGANIZATION_KEY =
  "dim_selected_organization_id";

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

  const ascending =
    !String(sort).startsWith("-");

  const base44Column =
    String(sort).replace(/^-/, "");

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
    throw new Error(
      `Unknown entity: ${entityName}`
    );
  }

  return table;
}

function getStoredOrganizationId() {
  try {
    return window.localStorage.getItem(
      SELECTED_ORGANIZATION_KEY
    );
  } catch {
    return null;
  }
}

function storeOrganizationId(
  organizationId
) {
  try {
    if (organizationId) {
      window.localStorage.setItem(
        SELECTED_ORGANIZATION_KEY,
        organizationId
      );
    } else {
      window.localStorage.removeItem(
        SELECTED_ORGANIZATION_KEY
      );
    }
  } catch {
    // Ignore localStorage errors.
  }
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
    throw new Error(
      "Not authenticated"
    );
  }

  return user;
}

async function getCurrentProfile() {
  const authUser =
    await getAuthenticatedUser();

  const { data: profile, error } =
    await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .single();

  if (error) {
    throw error;
  }

  if (!profile) {
    throw new Error(
      "User profile not found"
    );
  }

  return {
    ...profile,
    email: authUser.email,
  };
}

async function getOrganizationMemberships() {
  const authUser =
    await getAuthenticatedUser();

  const { data, error } =
    await supabase
      .from("organization_members")
      .select(`
        organization_id,
        role,
        organizations (
          id,
          name,
          created_at
        )
      `)
      .eq("user_id", authUser.id);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .filter(
      (membership) =>
        membership.organizations
    )
    .map((membership) => ({
      id:
        membership.organizations.id,
      name:
        membership.organizations.name,
      created_at:
        membership.organizations
          .created_at,
      role: membership.role,
    }))
    .sort((a, b) =>
      String(a.name || "").localeCompare(
        String(b.name || "")
      )
    );
}

async function userHasOrganizationAccess(
  userId,
  organizationId
) {
  if (!userId || !organizationId) {
    return false;
  }

  const { data, error } =
    await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .eq(
        "organization_id",
        organizationId
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

async function getCurrentOrganizationId() {
  const profile =
    await getCurrentProfile();

  const isAdmin =
    profile.role === "admin";

  /*
   * STAFF RULE
   *
   * Staff members never use the
   * selected organization stored
   * in localStorage.
   *
   * They are always locked to the
   * organization assigned directly
   * to their profile.
   */
  if (!isAdmin) {
    storeOrganizationId(null);

    if (!profile.organization_id) {
      throw new Error(
        "Your account is not assigned to a dental office."
      );
    }

    return profile.organization_id;
  }

  /*
   * ADMIN RULE
   *
   * Admins may switch between
   * organizations they are
   * authorized to access.
   */
  const selectedOrganizationId =
    getStoredOrganizationId();

  if (selectedOrganizationId) {
    const hasAccess =
      await userHasOrganizationAccess(
        profile.id,
        selectedOrganizationId
      );

    if (hasAccess) {
      return selectedOrganizationId;
    }

    storeOrganizationId(null);
  }

  /*
   * Fall back to the admin's
   * original assigned organization.
   */
  if (profile.organization_id) {
    const hasOriginalAccess =
      await userHasOrganizationAccess(
        profile.id,
        profile.organization_id
      );

    if (hasOriginalAccess) {
      storeOrganizationId(
        profile.organization_id
      );

      return profile.organization_id;
    }
  }

  /*
   * Final fallback:
   * use the first authorized office.
   */
  const memberships =
    await getOrganizationMemberships();

  if (memberships.length > 0) {
    const firstOrganizationId =
      memberships[0].id;

    storeOrganizationId(
      firstOrganizationId
    );

    return firstOrganizationId;
  }

  throw new Error(
    "Your account is not assigned to a dental office."
  );
}

async function setCurrentOrganizationId(
  organizationId
) {
  const profile =
    await getCurrentProfile();

  /*
   * Only admins are allowed
   * to switch organizations.
   */
  if (profile.role !== "admin") {
    throw new Error(
      "Only administrators can switch dental offices."
    );
  }

  const normalizedOrganizationId =
    String(
      organizationId || ""
    ).trim();

  if (!normalizedOrganizationId) {
    throw new Error(
      "A valid dental office is required."
    );
  }

  const hasAccess =
    await userHasOrganizationAccess(
      profile.id,
      normalizedOrganizationId
    );

  if (!hasAccess) {
    throw new Error(
      "You do not have access to this dental office."
    );
  }

  storeOrganizationId(
    normalizedOrganizationId
  );

  return normalizedOrganizationId;
}

async function getCurrentOrganization() {
  const organizationId =
    await getCurrentOrganizationId();

  const { data, error } =
    await supabase
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .single();

  if (error) {
    throw error;
  }

  return data;
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
    throw new Error(
      "Not authenticated"
    );
  }

  return session;
}

async function addOrganizationToPayload(
  entityName,
  payload
) {
  if (
    !organizationOwnedEntities.has(
      entityName
    )
  ) {
    return {
      ...payload,
    };
  }

  const organizationId =
    await getCurrentOrganizationId();

  return {
    ...payload,
    organization_id:
      organizationId,
  };
}

function removeProtectedFields(
  entityName,
  payload
) {
  const safePayload = {
    ...payload,
  };

  if (
    organizationOwnedEntities.has(
      entityName
    )
  ) {
    delete safePayload.organization_id;
  }

  if (entityName === "User") {
    delete safePayload.id;
    delete safePayload.organization_id;
  }

  return safePayload;
}

async function applyOrganizationFilter(
  entityName,
  query
) {
  if (
    !organizationOwnedEntities.has(
      entityName
    )
  ) {
    return query;
  }

  const organizationId =
    await getCurrentOrganizationId();

  return query.eq(
    "organization_id",
    organizationId
  );
}

function entity(entityName) {
  const table =
    tableFor(entityName);

  return {
    async list(sort, limit) {
      const {
        column,
        ascending,
      } = parseSort(sort);

      let query = supabase
        .from(table)
        .select("*");

      query =
        await applyOrganizationFilter(
          entityName,
          query
        );

      query = query.order(
        column,
        {
          ascending,
        }
      );

      if (limit) {
        query =
          query.limit(limit);
      }

      const {
        data,
        error,
      } = await query;

      if (error) {
        throw error;
      }

      return data ?? [];
    },

    async filter(
      filters = {},
      sort,
      limit
    ) {
      const {
        column,
        ascending,
      } = parseSort(sort);

      let query = supabase
        .from(table)
        .select("*");

      query =
        await applyOrganizationFilter(
          entityName,
          query
        );

      Object.entries(
        filters
      ).forEach(
        ([key, value]) => {
          if (
            value === undefined ||
            value === null
          ) {
            return;
          }

          if (
            organizationOwnedEntities.has(
              entityName
            ) &&
            key ===
              "organization_id"
          ) {
            return;
          }

          query =
            query.eq(
              key,
              value
            );
        }
      );

      query = query.order(
        column,
        {
          ascending,
        }
      );

      if (limit) {
        query =
          query.limit(limit);
      }

      const {
        data,
        error,
      } = await query;

      if (error) {
        throw error;
      }

      return data ?? [];
    },

    async create(payload) {
      const insertPayload =
        await addOrganizationToPayload(
          entityName,
          payload
        );

      const {
        data,
        error,
      } = await supabase
        .from(table)
        .insert(
          insertPayload
        )
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },

    async update(
      id,
      payload
    ) {
      const updatePayload =
        removeProtectedFields(
          entityName,
          payload
        );

      let query = supabase
        .from(table)
        .update(
          updatePayload
        )
        .eq("id", id);

      if (
        organizationOwnedEntities.has(
          entityName
        )
      ) {
        const organizationId =
          await getCurrentOrganizationId();

        query = query.eq(
          "organization_id",
          organizationId
        );
      }

      const {
        data,
        error,
      } = await query
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },

    async delete(id) {
      let query = supabase
        .from(table)
        .delete()
        .eq("id", id);

      if (
        organizationOwnedEntities.has(
          entityName
        )
      ) {
        const organizationId =
          await getCurrentOrganizationId();

        query = query.eq(
          "organization_id",
          organizationId
        );
      }

      const { error } =
        await query;

      if (error) {
        throw error;
      }

      return true;
    },
  };
}

export const dim = {
  entities:
    Object.fromEntries(
      Object.keys(
        entityToTable
      ).map((name) => [
        name,
        entity(name),
      ])
    ),

  organizations: {
    async list() {
      const profile =
        await getCurrentProfile();

      /*
       * Staff only receive
       * their assigned office.
       */
      if (
        profile.role !==
        "admin"
      ) {
        if (
          !profile.organization_id
        ) {
          return [];
        }

        const {
          data,
          error,
        } = await supabase
          .from("organizations")
          .select(`
            id,
            name,
            created_at
          `)
          .eq(
            "id",
            profile.organization_id
          )
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          return [];
        }

        return [
          {
            ...data,
            role: profile.role,
          },
        ];
      }

      return getOrganizationMemberships();
    },

    async getCurrent() {
      return getCurrentOrganization();
    },

    async getCurrentId() {
      return getCurrentOrganizationId();
    },

    async setCurrent(
      organizationId
    ) {
      return setCurrentOrganizationId(
        organizationId
      );
    },

    async clearCurrent() {
      const profile =
        await getCurrentProfile();

      if (
        profile.role !==
        "admin"
      ) {
        return true;
      }

      storeOrganizationId(null);

      return true;
    },
  },

  auth: {
    async isAuthenticated() {
      const {
        data: { session },
        error,
      } =
        await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      return Boolean(
        session
      );
    },

    async me() {
      return getCurrentProfile();
    },

    async updateMe(payload) {
      const authUser =
        await getAuthenticatedUser();

      const safePayload = {
        ...payload,
      };

      delete safePayload.id;
      delete safePayload.email;
      delete safePayload.role;
      delete safePayload.organization_id;

      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .update(
          safePayload
        )
        .eq(
          "id",
          authUser.id
        )
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },

    async logout(
      redirectTo = "/"
    ) {
      storeOrganizationId(null);

      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      if (redirectTo) {
        window.location.href =
          redirectTo;
      }
    },

    redirectToLogin(
      redirectTo =
        window.location.href
    ) {
      const url =
        new URL(
          "/login",
          window.location.origin
        );

      url.searchParams.set(
        "redirectTo",
        redirectTo
      );

      window.location.href =
        url.toString();
    },
  },

  integrations: {
    Core: {
      async UploadFile({
        file,
      }) {
        if (!file) {
          throw new Error(
            "No file was provided."
          );
        }

        const organizationId =
          await getCurrentOrganizationId();

        const safeFileName =
          file.name.replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
          );

        const path =
          `${organizationId}/` +
          `${crypto.randomUUID()}-` +
          safeFileName;

        const {
          error:
            uploadError,
        } =
          await supabase.storage
            .from(
              "item-images"
            )
            .upload(
              path,
              file,
              {
                upsert: false,
              }
            );

        if (uploadError) {
          throw uploadError;
        }

        const { data } =
          supabase.storage
            .from(
              "item-images"
            )
            .getPublicUrl(
              path
            );

        return {
          file_url:
            data.publicUrl,
        };
      },
    },
  },

  users: {
    async inviteUser({
      email,
      role = "user",
    }) {
      await requireSession();

      const profile =
        await getCurrentProfile();

      if (
        profile.role !==
        "admin"
      ) {
        throw new Error(
          "Only administrators can invite users."
        );
      }

      const normalizedEmail =
        String(
          email || ""
        )
          .trim()
          .toLowerCase();

      const normalizedRole =
        String(
          role || "user"
        )
          .trim()
          .toLowerCase();

      if (
        !normalizedEmail ||
        !normalizedEmail.includes(
          "@"
        )
      ) {
        throw new Error(
          "Enter a valid email address."
        );
      }

      if (
        normalizedRole !==
          "user" &&
        normalizedRole !==
          "admin"
      ) {
        throw new Error(
          "Role must be either user or admin."
        );
      }

      const organizationId =
        await getCurrentOrganizationId();

      const {
        data,
        error,
      } =
        await supabase.functions.invoke(
          "invite-user",
          {
            body: {
              email:
                normalizedEmail,
              role:
                normalizedRole,
              organizationId,
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
        throw new Error(
          data.error
        );
      }

      return data;
    },

    async deleteUser(
      userId
    ) {
      await requireSession();

      const profile =
        await getCurrentProfile();

      if (
        profile.role !==
        "admin"
      ) {
        throw new Error(
          "Only administrators can delete users."
        );
      }

      const normalizedUserId =
        String(
          userId || ""
        ).trim();

      if (
        !normalizedUserId
      ) {
        throw new Error(
          "A valid user ID is required."
        );
      }

      const organizationId =
        await getCurrentOrganizationId();

      const {
        data,
        error,
      } =
        await supabase.functions.invoke(
          "delete-user",
          {
            body: {
              userId:
                normalizedUserId,
              organizationId,
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
        throw new Error(
          data.error
        );
      }

      return data;
    },
  },
};