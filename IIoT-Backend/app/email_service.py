import os
import httpx

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
# For quick testing you can leave this as Resend's shared test domain — but
# note that domain only delivers to the email address your Resend account
# was signed up with. Once you verify your own domain in the Resend
# dashboard, switch this to something like "Dragonfly.io <noreply@dragonfly.io>".
RESEND_FROM = os.getenv("RESEND_FROM", "Dragonfly.io <onboarding@resend.dev>")

RESEND_API_URL = "https://api.resend.com/emails"


async def send_reset_email(email: str, reset_link: str):
    print("\n" + "=" * 60)
    print(f"=== [EMAIL] Attempting to send to: {email}")
    print(f"=== [EMAIL] RESEND_FROM: {RESEND_FROM}")
    print(f"=== [EMAIL] Reset link: {reset_link}")
    print("=" * 60)

    if not RESEND_API_KEY:
        print("=== [EMAIL] ❌ FAILED: RESEND_API_KEY is not set")
        return

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
      <h2 style="font-size: 20px; font-weight: 900; color: #111827; margin-bottom: 8px;">
        Dragonfly<span style="color: #9ca3af;">.</span><span style="color: #2563eb;">io</span>
      </h2>
      <p style="color: #6b7280; font-size: 14px; margin-bottom: 24px;">Password Reset Request</p>
      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <p style="color: #374151; font-size: 14px; margin: 0 0 16px 0;">
          We received a request to reset your password. Click the button below.
          This link expires in <strong>15 minutes</strong>.
        </p>
        <a href="{reset_link}"
           style="display: inline-block; background: #2563eb; color: white; text-decoration: none;
                  padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">
          Reset Password →
        </a>
      </div>
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
    """

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                RESEND_API_URL,
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": RESEND_FROM,
                    "to": [email],
                    "subject": "Reset your Dragonfly.io password",
                    "html": html,
                },
            )

        if resp.status_code in (200, 201):
            print(f"=== [EMAIL] ✅ Successfully sent to: {email}")
        else:
            print(f"=== [EMAIL] ❌ FAILED to send to {email}")
            print(f"=== [EMAIL] Status code: {resp.status_code}")
            print(f"=== [EMAIL] Response body: {resp.text}")

    except Exception as e:
        print(f"=== [EMAIL] ❌ FAILED to send to {email}")
        print(f"=== [EMAIL] Error type: {type(e).__name__}")
        print(f"=== [EMAIL] Error detail: {str(e)}")