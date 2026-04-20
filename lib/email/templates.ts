const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.tickworks.com";

export function employeeJoinRequestEmail({
	employeeName,
	employeeEmail,
	orgName,
}: {
	employeeName: string;
	employeeEmail: string;
	orgName: string;
}) {
	return {
		subject: `New employee join request — ${orgName}`,
		html: `
<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1e293b">
  <img src="${BASE_URL}/logo-plain.webp" alt="Tickworks" width="40" style="margin-bottom:20px" />
  <h2 style="margin:0 0 8px;font-size:18px;font-weight:700">New join request</h2>
  <p style="margin:0 0 24px;color:#64748b;font-size:14px">
    <strong style="color:#1e293b">${employeeName}</strong> (${employeeEmail}) has requested to join
    <strong style="color:#1e293b">${orgName}</strong> on Tickworks.
  </p>
  <a href="${BASE_URL}/dashboard/employees/join-requests"
     style="display:inline-block;background:#80ed99;color:#1e293b;font-weight:600;font-size:14px;padding:10px 22px;border-radius:8px;text-decoration:none">
    Review Request →
  </a>
  <p style="margin:32px 0 0;font-size:12px;color:#94a3b8">
    You're receiving this because you are an admin of ${orgName} on Tickworks.
  </p>
</div>`,
	};
}

export function employeeWelcomeEmail({
	employeeName,
	employeeEmail,
	tempPassword,
	orgName,
}: {
	employeeName: string;
	employeeEmail: string;
	tempPassword: string;
	orgName: string;
}) {
	return {
		subject: `Your Tickworks account is ready — ${orgName}`,
		html: `
<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1e293b">
  <img src="${BASE_URL}/logo-plain.webp" alt="Tickworks" width="40" style="margin-bottom:20px" />
  <h2 style="margin:0 0 8px;font-size:18px;font-weight:700">Welcome to ${orgName} on Tickworks</h2>
  <p style="margin:0 0 24px;color:#64748b;font-size:14px">
    Hi ${employeeName}, your account has been created. Use the credentials below to sign in.
  </p>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin-bottom:24px">
    <p style="margin:0 0 8px;font-size:13px;color:#64748b">Email</p>
    <p style="margin:0 0 16px;font-size:15px;font-weight:600">${employeeEmail}</p>
    <p style="margin:0 0 8px;font-size:13px;color:#64748b">Temporary password</p>
    <p style="margin:0;font-size:15px;font-weight:600;font-family:monospace;letter-spacing:0.05em">${tempPassword}</p>
  </div>
  <a href="${BASE_URL}/login"
     style="display:inline-block;background:#80ed99;color:#1e293b;font-weight:600;font-size:14px;padding:10px 22px;border-radius:8px;text-decoration:none">
    Sign in to Tickworks →
  </a>
  <p style="margin:24px 0 0;font-size:13px;color:#94a3b8">
    Please change your password after your first login.
  </p>
</div>`,
	};
}
