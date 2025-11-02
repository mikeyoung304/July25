# Database Schema

**Last Updated:** 2025-11-02

This document describes the PostgreSQL database schema for Restaurant OS.

## Overview

The database uses PostgreSQL with Row-Level Security (RLS) policies for multi-tenant data isolation.

### Key Features
- **Multi-tenancy**: All data is scoped by `restaurant_id`
- **Row-Level Security**: Automatic data isolation per restaurant
- **Audit Logging**: Comprehensive change tracking
- **Real-time**: Supabase Realtime enabled for live updates

## Core Tables

### audit_log_entries

**Model**: `audit_log_entries`

| Column | Type | Description |
| ------ | ---- | ----------- |
| instance_id | TEXT | instance id |
| id | TEXT | Primary key (required) |
| payload | JSONB | payload |
| created_at | TIMESTAMP | Timestamp |
| ip_address | TEXT | ip address |

### flow_state

**Model**: `flow_state`

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | TEXT | Primary key (required) |
| user_id | TEXT | user id |
| auth_code | TEXT | auth code (required) |
| code_challenge_method | code_challenge_method | code challenge method (required) |
| code_challenge | TEXT | code challenge (required) |
| provider_type | TEXT | provider type (required) |
| provider_access_token | TEXT | provider access token |
| provider_refresh_token | TEXT | provider refresh token |
| created_at | TIMESTAMP | Timestamp |
| updated_at | TIMESTAMP | Timestamp |
| authentication_method | TEXT | authentication method (required) |
| auth_code_issued_at | TIMESTAMP | Timestamp |
| saml_relay_states | saml_relay_states | saml relay states (required) |

### identities

**Model**: `identities`

| Column | Type | Description |
| ------ | ---- | ----------- |
| provider_id | TEXT | provider id (required) |
| user_id | TEXT | user id (required) |
| identity_data | JSONB | identity data (required) |
| provider | TEXT | provider (required) |
| last_sign_in_at | TIMESTAMP | Timestamp |
| created_at | TIMESTAMP | Timestamp |
| updated_at | TIMESTAMP | Timestamp |
| email | TEXT | email |
| id | TEXT | Primary key |

### instances

**Model**: `instances`

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | TEXT | Primary key (required) |
| uuid | TEXT | uuid |
| raw_base_config | TEXT | raw base config |
| created_at | TIMESTAMP | Timestamp |
| updated_at | TIMESTAMP | Timestamp |

### mfa_amr_claims

**Model**: `mfa_amr_claims`

| Column | Type | Description |
| ------ | ---- | ----------- |
| session_id | TEXT | session id (required) |
| created_at | TIMESTAMP | Timestamp (required) |
| updated_at | TIMESTAMP | Timestamp (required) |
| authentication_method | TEXT | authentication method (required) |
| id | TEXT | Primary key (required) |

### mfa_challenges

**Model**: `mfa_challenges`

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | TEXT | Primary key (required) |
| factor_id | TEXT | factor id (required) |
| created_at | TIMESTAMP | Timestamp (required) |
| verified_at | TIMESTAMP | Timestamp |
| ip_address | TEXT | ip address (required) |
| otp_code | TEXT | otp code |
| web_authn_session_data | JSONB | web authn session data |

### mfa_factors

**Model**: `mfa_factors`

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | TEXT | Primary key (required) |
| user_id | TEXT | user id (required) |
| friendly_name | TEXT | friendly name |
| factor_type | factor_type | factor type (required) |
| status | factor_status | status (required) |
| created_at | TIMESTAMP | Timestamp (required) |
| updated_at | TIMESTAMP | Timestamp (required) |
| secret | TEXT | secret |
| phone | TEXT | phone |
| last_challenged_at | TIMESTAMP | Unique identifier |
| web_authn_credential | JSONB | web authn credential |
| web_authn_aaguid | TEXT | web authn aaguid |
| mfa_challenges | mfa_challenges | mfa challenges (required) |

### oauth_authorizations

**Model**: `oauth_authorizations`

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | TEXT | Primary key (required) |
| authorization_id | TEXT | Unique identifier (required) |
| client_id | TEXT | client id (required) |
| user_id | TEXT | user id |
| redirect_uri | TEXT | redirect uri (required) |
| scope | TEXT | scope (required) |
| state | TEXT | state |
| resource | TEXT | resource |
| code_challenge | TEXT | code challenge |
| code_challenge_method | code_challenge_method | code challenge method |
| response_type | oauth_response_type | response type |
| status | oauth_authorization_status | status |
| authorization_code | TEXT | Unique identifier |
| created_at | TIMESTAMP | Timestamp |
| expires_at | TIMESTAMP | Timestamp |
| approved_at | TIMESTAMP | Timestamp |

### oauth_clients

**Model**: `oauth_clients`

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | TEXT | Primary key (required) |
| client_secret_hash | TEXT | client secret hash |
| registration_type | oauth_registration_type | registration type (required) |
| redirect_uris | TEXT | redirect uris (required) |
| grant_types | TEXT | grant types (required) |
| client_name | TEXT | client name |
| client_uri | TEXT | client uri |
| logo_uri | TEXT | logo uri |
| created_at | TIMESTAMP | Timestamp |
| updated_at | TIMESTAMP | Timestamp |
| deleted_at | TIMESTAMP | Timestamp |
| client_type | oauth_client_type | client type |
| oauth_authorizations | oauth_authorizations | oauth authorizations (required) |
| oauth_consents | oauth_consents | oauth consents (required) |
| sessions | sessions | sessions (required) |

### oauth_consents

**Model**: `oauth_consents`

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | TEXT | Primary key (required) |
| user_id | TEXT | user id (required) |
| client_id | TEXT | client id (required) |
| scopes | TEXT | scopes (required) |
| granted_at | TIMESTAMP | Timestamp |
| revoked_at | TIMESTAMP | Timestamp |

### one_time_tokens

**Model**: `one_time_tokens`

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | TEXT | Primary key (required) |
| user_id | TEXT | user id (required) |
| token_type | one_time_token_type | token type (required) |
| token_hash | TEXT | token hash (required) |
| relates_to | TEXT | relates to (required) |
| created_at | TIMESTAMP | Timestamp |
| updated_at | TIMESTAMP | Timestamp |

### refresh_tokens

**Model**: `refresh_tokens`

| Column | Type | Description |
| ------ | ---- | ----------- |
| instance_id | TEXT | instance id |
| id | BigInt | Primary key |
| token | TEXT | Unique identifier |
| user_id | TEXT | user id |
| revoked | BOOLEAN | revoked |
| created_at | TIMESTAMP | Timestamp |
| updated_at | TIMESTAMP | Timestamp |
| parent | TEXT | parent |
| session_id | TEXT | session id |

### saml_providers

**Model**: `saml_providers`

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | TEXT | Primary key (required) |
| sso_provider_id | TEXT | sso provider id (required) |
| entity_id | TEXT | Unique identifier (required) |
| metadata_xml | TEXT | metadata xml (required) |
| metadata_url | TEXT | metadata url |
| attribute_mapping | JSONB | attribute mapping |
| created_at | TIMESTAMP | Timestamp |
| updated_at | TIMESTAMP | Timestamp |
| name_id_format | TEXT | name id format |

### saml_relay_states

**Model**: `saml_relay_states`

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | TEXT | Primary key (required) |
| sso_provider_id | TEXT | sso provider id (required) |
| request_id | TEXT | request id (required) |
| for_email | TEXT | for email |
| redirect_to | TEXT | redirect to |
| created_at | TIMESTAMP | Timestamp |
| updated_at | TIMESTAMP | Timestamp |
| flow_state_id | TEXT | flow state id |

### schema_migrations

**Model**: `schema_migrations`

| Column | Type | Description |
| ------ | ---- | ----------- |
| version | TEXT | Primary key (required) |

### sessions

**Model**: `sessions`

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | TEXT | Primary key (required) |
| user_id | TEXT | user id (required) |
| created_at | TIMESTAMP | Timestamp |
| updated_at | TIMESTAMP | Timestamp |
| factor_id | TEXT | factor id |
| aal | aal_level | aal |
| not_after | TIMESTAMP | not after |
| refreshed_at | TIMESTAMP | Timestamp |
| user_agent | TEXT | user agent |
| ip | TEXT | ip |
| tag | TEXT | tag |
| oauth_client_id | TEXT | oauth client id |
| mfa_amr_claims | mfa_amr_claims | mfa amr claims (required) |
| refresh_tokens | refresh_tokens | refresh tokens (required) |

### sso_domains

**Model**: `sso_domains`

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | TEXT | Primary key (required) |
| sso_provider_id | TEXT | sso provider id (required) |
| domain | TEXT | domain (required) |
| created_at | TIMESTAMP | Timestamp |
| updated_at | TIMESTAMP | Timestamp |

### sso_providers

**Model**: `sso_providers`

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | TEXT | Primary key (required) |
| resource_id | TEXT | resource id |
| created_at | TIMESTAMP | Timestamp |
| updated_at | TIMESTAMP | Timestamp |
| disabled | BOOLEAN | disabled |
| saml_providers | saml_providers | saml providers (required) |
| saml_relay_states | saml_relay_states | saml relay states (required) |
| sso_domains | sso_domains | sso domains (required) |

### users

**Model**: `users`

| Column | Type | Description |
| ------ | ---- | ----------- |
| instance_id | TEXT | instance id |
| id | TEXT | Primary key (required) |
| aud | TEXT | aud |
| role | TEXT | role |
| email | TEXT | email |
| encrypted_password | TEXT | encrypted password |
| email_confirmed_at | TIMESTAMP | Timestamp |
| invited_at | TIMESTAMP | Timestamp |
| confirmation_token | TEXT | confirmation token |
| confirmation_sent_at | TIMESTAMP | Timestamp |
| recovery_token | TEXT | recovery token |
| recovery_sent_at | TIMESTAMP | Timestamp |
| email_change_token_new | TEXT | email change token new |
| email_change | TEXT | email change |
| email_change_sent_at | TIMESTAMP | Timestamp |
| last_sign_in_at | TIMESTAMP | Timestamp |
| raw_app_meta_data | JSONB | raw app meta data |
| raw_user_meta_data | JSONB | raw user meta data |
| is_super_admin | BOOLEAN | is super admin |
| created_at | TIMESTAMP | Timestamp |
| updated_at | TIMESTAMP | Timestamp |
| phone | TEXT | Unique identifier |
| phone_confirmed_at | TIMESTAMP | Timestamp |
| phone_change | TEXT | phone change |
| phone_change_token | TEXT | phone change token |
| phone_change_sent_at | TIMESTAMP | Timestamp |
| confirmed_at | TIMESTAMP | Timestamp |
| email_change_token_current | TEXT | email change token current |
| email_change_confirm_status | INTEGER | email change confirm status |
| banned_until | TIMESTAMP | banned until |
| reauthentication_token | TEXT | reauthentication token |
| reauthentication_sent_at | TIMESTAMP | Timestamp |
| is_sso_user | BOOLEAN | is sso user |
| deleted_at | TIMESTAMP | Timestamp |
| is_anonymous | BOOLEAN | is anonymous |
| identities | identities | identities (required) |
| mfa_factors | mfa_factors | mfa factors (required) |
| oauth_authorizations | oauth_authorizations | oauth authorizations (required) |
| oauth_consents | oauth_consents | oauth consents (required) |
| one_time_tokens | one_time_tokens | one time tokens (required) |
| sessions | sessions | sessions (required) |
| payment_audit_logs | payment_audit_logs | payment audit logs (required) |
| user_pins | user_pins | user pins (required) |
| user_profiles | user_profiles | user profiles |
| user_restaurants | user_restaurants | user restaurants (required) |

### api_scopes

**Model**: `api_scopes`

| Column | Type | Description |
| ------ | ---- | ----------- |
| scope | TEXT | Primary key (required) |
| description | TEXT | description |
| role_scopes | role_scopes | role scopes (required) |

### menu_categories

**Model**: `menu_categories`

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | TEXT | Primary key |
| restaurant_id | TEXT | restaurant id (required) |
| name | TEXT | name (required) |
| slug | TEXT | slug (required) |
| description | TEXT | description |
| display_order | INTEGER | display order |
| active | BOOLEAN | active |
| created_at | TIMESTAMP | Timestamp |
| updated_at | TIMESTAMP | Timestamp |
| menu_items | menu_items | menu items (required) |

### menu_items

**Model**: `menu_items`

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | TEXT | Primary key |
| restaurant_id | TEXT | restaurant id (required) |
| category_id | TEXT | category id |
| name | TEXT | name (required) |
| description | TEXT | description |
| price | NUMERIC | price (required) |
| active | BOOLEAN | active |
| available | BOOLEAN | available |
| dietary_flags | TEXT | dietary flags (required) |
| modifiers | JSONB | modifiers |
| aliases | TEXT | aliases (required) |
| prep_time_minutes | INTEGER | prep time minutes |
| image_url | TEXT | image url |
| created_at | TIMESTAMP | Timestamp |
| updated_at | TIMESTAMP | Timestamp |
| external_id | TEXT | Unique identifier (required) |

### order_status_history

**Model**: `order_status_history`

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | TEXT | Primary key |
| order_id | TEXT | order id |
| restaurant_id | TEXT | restaurant id |
| from_status | TEXT | from status |
| to_status | TEXT | to status (required) |
| changed_by | TEXT | changed by |
| changed_at | TIMESTAMP | Timestamp |
| notes | TEXT | notes |
| created_at | TIMESTAMP | Timestamp |

### orders

**Model**: `orders`

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | TEXT | Primary key |
| restaurant_id | TEXT | restaurant id (required) |
| order_number | TEXT | order number (required) |
| type | TEXT | type |
| status | TEXT | status |
| items | JSONB | items |
| subtotal | NUMERIC | subtotal |
| tax | NUMERIC | tax |
| total_amount | NUMERIC | total amount |
| notes | TEXT | notes |
| customer_name | TEXT | customer name |
| table_number | TEXT | table number |
| metadata | JSONB | metadata |

### restaurants

**Model**: `restaurants`

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | TEXT | Primary key |
| name | TEXT | name (required) |
| slug | TEXT | Unique identifier (required) |
| timezone | TEXT | timezone |
| settings | JSONB | settings |

### role_scopes

**Model**: `role_scopes`

| Column | Type | Description |
| ------ | ---- | ----------- |
| role | TEXT | role (required) |
| scope | TEXT | scope (required) |

### station_tokens

**Model**: `station_tokens`

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | TEXT | Primary key |
| restaurant_id | TEXT | restaurant id (required) |
| station_type | TEXT | station type (required) |
| label | TEXT | label |
| created_at | TIMESTAMP | Timestamp |

### tables

**Model**: `tables`

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | TEXT | Primary key |
| restaurant_id | TEXT | restaurant id (required) |
| created_at | TIMESTAMP | Timestamp |
| updated_at | TIMESTAMP | Timestamp |
| label | TEXT | label (required) |
| seats | INTEGER | seats |
| x_pos | NUMERIC | x pos |
| y_pos | NUMERIC | y pos |
| width | NUMERIC | width |
| height | NUMERIC | height |
| rotation | INTEGER | rotation |
| shape | TEXT | shape |
| status | TEXT | status |
| current_order_id | TEXT | current order id |
| active | BOOLEAN | active |
| z_index | INTEGER | z index |

### user_pins

**Model**: `user_pins`

| Column | Type | Description |
| ------ | ---- | ----------- |
| user_id | TEXT | user id |
| restaurant_id | TEXT | restaurant id |
| pin | TEXT | pin (required) |

### user_profiles

**Model**: `user_profiles`

| Column | Type | Description |
| ------ | ---- | ----------- |
| user_id | TEXT | Primary key (required) |
| display_name | TEXT | display name |
| phone | TEXT | phone |
| created_at | TIMESTAMP | Timestamp |

### user_restaurants

**Model**: `user_restaurants`

| Column | Type | Description |
| ------ | ---- | ----------- |
| user_id | TEXT | user id (required) |
| restaurant_id | TEXT | restaurant id (required) |
| role | TEXT | role (required) |
| is_active | BOOLEAN | is active |

### voice_order_logs

**Model**: `voice_order_logs`

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | TEXT | Primary key |
| restaurant_id | TEXT | restaurant id (required) |
| order_id | TEXT | order id |
| transcription | TEXT | transcription (required) |
| parsed_items | JSONB | parsed items |
| confidence_score | NUMERIC | confidence score |
| success | BOOLEAN | success |
| error_message | TEXT | error message |
| audio_url | TEXT | audio url |
| device_id | TEXT | device id |
| created_at | TIMESTAMP | Timestamp |

### payment_audit_logs

**Model**: `payment_audit_logs`

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | TEXT | Primary key |
| order_id | TEXT | order id |
| user_id | TEXT | user id |
| restaurant_id | TEXT | restaurant id (required) |
| amount | INTEGER | amount (required) |
| payment_method | TEXT | payment method (required) |
| payment_id | TEXT | payment id |
| status | TEXT | status (required) |
| error_code | TEXT | error code |
| error_detail | TEXT | error detail |
| ip_address | TEXT | ip address |
| user_agent | TEXT | user agent |
| idempotency_key | TEXT | Unique identifier |
| metadata | JSONB | metadata |

## Row-Level Security (RLS)

All tables have RLS policies that enforce:

1. **Restaurant Isolation**: Users can only access data for their restaurant
2. **Role-Based Access**: Different permissions for admin, manager, staff, customer
3. **Audit Trails**: All changes logged with user and timestamp

### Policy Structure

Each table typically has policies for:
- `SELECT`: Read access based on restaurant_id
- `INSERT`: Create with automatic restaurant_id assignment
- `UPDATE`: Modify own restaurant's data
- `DELETE`: Remove own restaurant's data (soft delete preferred)

## Indexes

Performance-critical indexes are created for:
- `restaurant_id` on all multi-tenant tables
- `user_id` for user-scoped queries
- `created_at` for time-range queries
- Composite indexes for common query patterns

## Migrations

Database schema is managed through Supabase migrations in `supabase/migrations/`.

To create a new migration:
```bash
npm run db:migration:new <migration_name>
```

To apply migrations:
```bash
npm run db:push
```

## Schema Validation

The Prisma schema file (`server/prisma/schema.prisma`) is the source of truth.
TypeScript types are generated from this schema.

---

*This file is auto-generated from `server/prisma/schema.prisma` by `scripts/fix-schema-drift.js`*
