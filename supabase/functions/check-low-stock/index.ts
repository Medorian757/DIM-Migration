import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

type InventoryItem = {
  name: string;
  case_quantity: number;
  case_unit?: string;
  min_cases: number;
  expiration_date?: string | null;
};

type Profile = {
  email: string | null;
  role: string;
};

async function sendEmail(to: string, subject: string, body: string) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('ALERT_FROM_EMAIL') || 'DIM Inventory <alerts@example.com>';

  if (!resendApiKey) {
    console.log(`Email not sent; missing RESEND_API_KEY. Intended recipient: ${to}`);
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: fromEmail, to, subject, text: body }),
  });

  if (!response.ok) {
    throw new Error(`Email send failed for ${to}: ${response.status} ${await response.text()}`);
  }
}

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json({ error: 'Missing Supabase service-role configuration.' }, { status: 500 });
    }

    const authHeader = req.headers.get('Authorization');
    const scheduleSecret = Deno.env.get('DIM_ALERT_SECRET');

    if (scheduleSecret && authHeader === `Bearer ${scheduleSecret}`) {
      // Scheduled/cron call is authorized.
    } else {
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
      if (!anonKey || !authHeader) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userError } = await userClient.auth.getUser();
      if (userError || !userData.user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const serviceClient = createClient(supabaseUrl, serviceRoleKey);
      const { data: profile, error: profileError } = await serviceClient
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .single();

      if (profileError || profile?.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const [{ data: items, error: itemsError }, { data: users, error: usersError }] = await Promise.all([
      supabase.from('inventory_items').select('*'),
      supabase.from('profiles').select('email, role'),
    ]);

    if (itemsError) throw itemsError;
    if (usersError) throw usersError;

    const inventoryItems = (items ?? []) as InventoryItem[];
    const adminUsers = ((users ?? []) as Profile[]).filter((u) => u.role === 'admin' && u.email);

    const lowStockItems = inventoryItems.filter((item) => item.min_cases > 0 && item.case_quantity < item.min_cases);

    const today = new Date();
    const expiringItems = inventoryItems
      .filter((item) => Boolean(item.expiration_date))
      .map((item) => {
        const exp = new Date(item.expiration_date as string);
        const daysLeft = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return { ...item, daysLeft };
      })
      .filter((item) => item.daysLeft <= 30);

    if (lowStockItems.length === 0 && expiringItems.length === 0) {
      return Response.json({ message: 'No alerts to send.', sent: 0 });
    }

    let body = 'Hi,\n\nHere is your daily DIM inventory summary:\n\n';

    if (lowStockItems.length > 0) {
      body += `LOW STOCK ITEMS (${lowStockItems.length}):\n`;
      body += lowStockItems
        .map((item) => `• ${item.name}: ${item.case_quantity} ${item.case_unit || 'cases'} on hand (min: ${item.min_cases})`)
        .join('\n');
      body += '\n\n';
    }

    if (expiringItems.length > 0) {
      body += `EXPIRING SOON (${expiringItems.length}):\n`;
      body += expiringItems
        .map((item) => {
          if (item.daysLeft < 0) return `• ${item.name}: EXPIRED (expired ${Math.abs(item.daysLeft)} day${Math.abs(item.daysLeft) !== 1 ? 's' : ''} ago)`;
          if (item.daysLeft === 0) return `• ${item.name}: EXPIRES TODAY`;
          return `• ${item.name}: expires in ${item.daysLeft} day${item.daysLeft !== 1 ? 's' : ''} (${item.expiration_date})`;
        })
        .join('\n');
      body += '\n\n';
    }

    body += 'Please review and take action as needed.\n\nThis is an automated notification from DIM.';

    const alertCount = lowStockItems.length + expiringItems.length;
    const subject = `DIM Daily Alert: ${alertCount} item${alertCount !== 1 ? 's' : ''} need attention`;

    if (adminUsers.length === 0) {
      return Response.json({ message: 'No admin users to notify.', lowStockCount: lowStockItems.length, expiringCount: expiringItems.length });
    }

    await Promise.all(adminUsers.map((admin) => sendEmail(admin.email as string, subject, body)));

    return Response.json({
      message: `Alert sent to ${adminUsers.length} admin(s).`,
      lowStockCount: lowStockItems.length,
      expiringCount: expiringItems.length,
      notifiedAdmins: adminUsers.map((u) => u.email),
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});
