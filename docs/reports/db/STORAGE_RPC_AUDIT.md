# Storage & RPC Audit

## Storage Buckets
Not checked - requires different API. Likely includes:
- Menu item images
- Receipt attachments
- User avatars

## RPC Functions
| Function | Purpose | Security |
|----------|---------|----------|
| is_member_of_restaurant(uuid) | Check user-restaurant membership | ✅ Used in RLS |
| is_service_role() | Check if service role | ✅ Used in RLS |
| moddatetime() | Trigger helper | N/A |
| update_updated_at_column() | Timestamp trigger | N/A |

## Security Assessment
- ✅ No exposed admin functions
- ✅ Helper functions properly secured
- ⚠️ Storage policies not verified (need separate check)

## Recommendations
1. Audit storage bucket policies
2. Ensure all buckets use RLS
3. Consider adding RPC for complex queries