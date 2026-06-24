import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled automation (no user) or admin user
    try {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    } catch {
      // Called from automation with no user context — treat as scheduled
    }

    // Fetch all inventory items and admin users
    const [items, users] = await Promise.all([
      base44.asServiceRole.entities.InventoryItem.list(),
      base44.asServiceRole.entities.User.list(),
    ]);

    // Find low stock items
    const lowStockItems = items.filter(
      (item) => item.min_cases > 0 && item.case_quantity < item.min_cases
    );

    // Find expiring items (within 30 days or already expired)
    const today = new Date();
    const expiringItems = items.filter((item) => {
      if (!item.expiration_date) return false;
      const exp = new Date(item.expiration_date);
      const daysLeft = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
      return daysLeft <= 30;
    }).map((item) => {
      const exp = new Date(item.expiration_date);
      const daysLeft = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
      return { ...item, daysLeft };
    });

    if (lowStockItems.length === 0 && expiringItems.length === 0) {
      return Response.json({ message: 'No alerts to send.', sent: 0 });
    }

    // Build email body
    let body = 'Hi,\n\nHere is your daily DIM inventory summary:\n\n';

    if (lowStockItems.length > 0) {
      body += `⚠️ LOW STOCK ITEMS (${lowStockItems.length}):\n`;
      body += lowStockItems
        .map((item) => `• ${item.name}: ${item.case_quantity} ${item.case_unit || 'cases'} on hand (min: ${item.min_cases})`)
        .join('\n');
      body += '\n\n';
    }

    if (expiringItems.length > 0) {
      body += `🗓️ EXPIRING SOON (${expiringItems.length}):\n`;
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
    const subject = `⚠️ DIM Daily Alert: ${alertCount} item${alertCount !== 1 ? 's' : ''} need attention`;

    // Send to all admin users
    const adminUsers = users.filter((u) => u.role === 'admin' && u.email);

    if (adminUsers.length === 0) {
      return Response.json({ message: 'No admin users to notify.', lowStockCount: lowStockItems.length, expiringCount: expiringItems.length });
    }

    await Promise.all(
      adminUsers.map((admin) =>
        base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject,
          body,
          from_name: 'DIM Inventory',
        })
      )
    );

    return Response.json({
      message: `Alert sent to ${adminUsers.length} admin(s).`,
      lowStockCount: lowStockItems.length,
      expiringCount: expiringItems.length,
      notifiedAdmins: adminUsers.map((u) => u.email),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});