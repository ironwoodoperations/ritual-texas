import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Invite Whitney Graham as admin
    await base44.users.inviteUser('ritualonmain@gmail.com', 'admin');

    return Response.json({ 
      success: true, 
      message: 'Whitney Graham has been invited as admin. She will receive an email to set up her password and access the system.'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});