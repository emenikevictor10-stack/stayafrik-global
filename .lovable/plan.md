# Email setup status

The sending address notify.stayglobal.app is still **pending**. No emails will send until the domain is verified.

## What's left (needs a workspace admin or owner)
Add these records where stayglobal.app's DNS is managed:

| Type | Host | Value |
|------|------|-------|
| TXT | `_lovable-email.stayglobal.app` | `lovable_email_verify=5341f956d4033c3678fc7be23ef82e45aee93a75cf66408b5482ab00c9614201` |
| NS | `notify.stayglobal.app` | `ns3.lovable.cloud` |
| NS | `notify.stayglobal.app` | `ns4.lovable.cloud` |

Then go to More → Emails and click Verify Domain. DNS changes can take up to 72 hours to show up.

## After verification
- All the email templates are already built, so emails start sending on their own.
- Emails queued earlier have probably timed out. They won't resend on their own.
- I'll send a test booking email to confirm delivery.

No code changes are needed right now.
