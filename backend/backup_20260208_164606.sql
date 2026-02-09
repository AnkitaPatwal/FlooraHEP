SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict eD5FDWDTbA5cRx0Rq67sMYfIDVbEKXfk1HvQJntakNqr9VUknQuAxQKE7Yn8I7U

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") VALUES
	('00000000-0000-0000-0000-000000000000', '868779e0-d390-4fb8-b7bd-9aa2fd5685f0', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"testing@gmail.com","user_id":"f0eb9e61-fb13-4e4b-a0f0-61e1d43139f4","user_phone":""}}', '2025-11-16 21:20:16.782325+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c8e07fed-9a5f-4208-a6e8-60dccce74b32', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"teating@gmail.com","user_id":"1534f859-0288-4e9d-a5e7-1599355d4551","user_phone":""}}', '2025-11-16 21:26:37.013878+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ad333d17-9478-40bf-9153-7c8e7781f9a9', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"tea@gmail.com","user_id":"0bbf93e5-34b4-4b4f-954c-d8971ced6236","user_phone":""}}', '2025-11-16 21:35:16.545989+00', ''),
	('00000000-0000-0000-0000-000000000000', '489676a4-6633-4276-800b-4136ef6eb43d', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"kayla.garibay31@gmail.com","user_id":"d26eeb07-e535-4c39-af56-65d198a564cb","user_phone":""}}', '2026-02-07 21:57:52.534757+00', ''),
	('00000000-0000-0000-0000-000000000000', '7b6a3f5b-1a6c-4db9-8483-d0c751700250', '{"action":"user_recovery_requested","actor_id":"d26eeb07-e535-4c39-af56-65d198a564cb","actor_username":"kayla.garibay31@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-02-07 22:59:39.144556+00', ''),
	('00000000-0000-0000-0000-000000000000', '1a43b185-afaf-4cf1-9fbe-c0c04e411298', '{"action":"user_recovery_requested","actor_id":"d26eeb07-e535-4c39-af56-65d198a564cb","actor_username":"kayla.garibay31@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-02-07 23:27:00.784163+00', ''),
	('00000000-0000-0000-0000-000000000000', '518c42e1-108a-4b0d-a2b3-e1514d45751d', '{"action":"user_recovery_requested","actor_id":"d26eeb07-e535-4c39-af56-65d198a564cb","actor_username":"kayla.garibay31@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-02-07 23:33:33.464264+00', ''),
	('00000000-0000-0000-0000-000000000000', '8ce07fb4-dfae-49ea-bb4d-588ca0a13dea', '{"action":"login","actor_id":"d26eeb07-e535-4c39-af56-65d198a564cb","actor_username":"kayla.garibay31@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-02-07 23:56:50.128324+00', ''),
	('00000000-0000-0000-0000-000000000000', '248d63e2-007c-422c-9275-3a409224ec03', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"sad@gmail.com","user_id":"23c0b367-c772-4023-b705-33d6d39c3798","user_phone":""}}', '2026-02-08 00:13:21.4426+00', ''),
	('00000000-0000-0000-0000-000000000000', '223214db-694a-438d-9bbf-9c9a40842603', '{"action":"login","actor_id":"23c0b367-c772-4023-b705-33d6d39c3798","actor_username":"sad@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-02-08 00:14:52.229879+00', ''),
	('00000000-0000-0000-0000-000000000000', 'cb3ee261-8b89-4466-93dc-59739eff25d3', '{"action":"login","actor_id":"23c0b367-c772-4023-b705-33d6d39c3798","actor_username":"sad@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-02-08 00:15:29.212093+00', ''),
	('00000000-0000-0000-0000-000000000000', '47f0f81d-976d-49a8-9c84-ac3f5dfe1cbd', '{"action":"login","actor_id":"23c0b367-c772-4023-b705-33d6d39c3798","actor_username":"sad@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-02-08 00:36:53.747269+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ed727dc6-0de9-4263-8689-4c44b0645b60', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"kks@gmail.com","user_id":"108b5d5b-c37d-43c5-8322-bbb98763962d","user_phone":""}}', '2026-02-08 01:30:04.400902+00', ''),
	('00000000-0000-0000-0000-000000000000', '496fe305-ae8d-451e-bff8-9b35bf5e48d9', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"kks@gmail.com","user_id":"108b5d5b-c37d-43c5-8322-bbb98763962d","user_phone":""}}', '2026-02-08 03:35:04.146183+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e68cc2f6-bc68-46df-9b74-4348a81f9cbc', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"kks@gmail.com","user_id":"3a879ee4-e346-4b20-b14a-dd30df38044f","user_phone":""}}', '2026-02-08 03:36:19.461683+00', ''),
	('00000000-0000-0000-0000-000000000000', '8ca59925-382b-45ac-aecf-0ef8ca67c73a', '{"action":"user_recovery_requested","actor_id":"d26eeb07-e535-4c39-af56-65d198a564cb","actor_username":"kayla.garibay31@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-02-08 03:50:06.071534+00', ''),
	('00000000-0000-0000-0000-000000000000', '613a2506-4799-4a2a-a33e-597ad313d3f3', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"happy@gmail.com","user_id":"3c5d2f75-6f91-48fa-9076-a140886692b4","user_phone":""}}', '2026-02-08 03:52:25.022667+00', ''),
	('00000000-0000-0000-0000-000000000000', '44144865-5728-440c-8177-0d0a835b47a0', '{"action":"user_recovery_requested","actor_id":"d26eeb07-e535-4c39-af56-65d198a564cb","actor_username":"kayla.garibay31@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-02-08 04:06:01.421606+00', ''),
	('00000000-0000-0000-0000-000000000000', '3b62e75f-af5f-4c95-ac44-78a8b0118efa', '{"action":"user_recovery_requested","actor_id":"d26eeb07-e535-4c39-af56-65d198a564cb","actor_username":"kayla.garibay31@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-02-08 04:20:37.443899+00', ''),
	('00000000-0000-0000-0000-000000000000', '529be748-e09d-4b31-84a9-8a7381db35b3', '{"action":"user_recovery_requested","actor_id":"d26eeb07-e535-4c39-af56-65d198a564cb","actor_username":"kayla.garibay31@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-02-08 04:23:28.219357+00', ''),
	('00000000-0000-0000-0000-000000000000', '1ef75939-15d3-4b42-b7cf-d533c732c184', '{"action":"user_recovery_requested","actor_id":"d26eeb07-e535-4c39-af56-65d198a564cb","actor_username":"kayla.garibay31@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-02-08 04:25:54.880451+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c9b8ac0f-4b56-402b-a37a-de16a85fa71a', '{"action":"user_recovery_requested","actor_id":"d26eeb07-e535-4c39-af56-65d198a564cb","actor_username":"kayla.garibay31@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-02-08 04:28:04.713509+00', ''),
	('00000000-0000-0000-0000-000000000000', 'cbdd37f9-d794-450f-a0c2-a1c36a17876e', '{"action":"user_recovery_requested","actor_id":"d26eeb07-e535-4c39-af56-65d198a564cb","actor_username":"kayla.garibay31@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-02-08 04:40:19.367995+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c47ba9de-5849-407e-b555-f120ccae1c21', '{"action":"user_recovery_requested","actor_id":"d26eeb07-e535-4c39-af56-65d198a564cb","actor_username":"kayla.garibay31@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-02-08 04:47:28.469518+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ec923cba-9d0f-405b-a651-ef9b824af292', '{"action":"user_recovery_requested","actor_id":"d26eeb07-e535-4c39-af56-65d198a564cb","actor_username":"kayla.garibay31@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-02-08 04:49:14.595899+00', ''),
	('00000000-0000-0000-0000-000000000000', '0792bd81-1a00-4507-a460-201edf0002c6', '{"action":"user_recovery_requested","actor_id":"d26eeb07-e535-4c39-af56-65d198a564cb","actor_username":"kayla.garibay31@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-02-08 04:50:56.995453+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ef17c52d-8ba9-46ec-9749-13da3c7a54a0', '{"action":"user_recovery_requested","actor_id":"d26eeb07-e535-4c39-af56-65d198a564cb","actor_username":"kayla.garibay31@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-02-08 04:52:31.206232+00', ''),
	('00000000-0000-0000-0000-000000000000', '176d2670-92d0-4c69-8877-59001e8f5ee1', '{"action":"user_recovery_requested","actor_id":"d26eeb07-e535-4c39-af56-65d198a564cb","actor_username":"kayla.garibay31@gmail.com","actor_via_sso":false,"log_type":"user"}', '2026-02-08 04:59:56.490911+00', '');


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', 'f0eb9e61-fb13-4e4b-a0f0-61e1d43139f4', 'authenticated', 'authenticated', 'testing@gmail.com', '$2a$10$anbWASRkW3Z9.DUgDNn3o.yG8Ob8bTxmj.Tax02RPd0aC6cijuC/G', '2025-11-16 21:20:16.799292+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2025-11-16 21:20:16.748401+00', '2025-11-16 21:20:16.803787+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '23c0b367-c772-4023-b705-33d6d39c3798', 'authenticated', 'authenticated', 'sad@gmail.com', '$2a$10$DTYKQb/MWi5fM3uxQFdmIuWaN/X7itDqDAW.gSh37LrD2WcQ.incC', '2026-02-08 00:13:21.454955+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-02-08 00:36:53.75964+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-02-08 00:13:21.420491+00', '2026-02-08 00:36:53.783009+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '1534f859-0288-4e9d-a5e7-1599355d4551', 'authenticated', 'authenticated', 'teating@gmail.com', '$2a$10$.9blLqfk4TYhGM9KOAW12OkPTvheoWKhXhqtROjzT2E6Ner6YzaYO', '2025-11-16 21:26:37.020793+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2025-11-16 21:26:37.005084+00', '2025-11-16 21:26:37.026805+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '0bbf93e5-34b4-4b4f-954c-d8971ced6236', 'authenticated', 'authenticated', 'tea@gmail.com', '$2a$10$NlttJT8MeYxVleq.UgaI.OehdJxUJVjDVWa2P.tcmbW8qpQT66/rO', '2025-11-16 21:35:16.549641+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2025-11-16 21:35:16.53409+00', '2025-11-16 21:35:16.551314+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '3a879ee4-e346-4b20-b14a-dd30df38044f', 'authenticated', 'authenticated', 'kks@gmail.com', '$2a$10$ZJU6nI1q.rxJgsKJezl1E.afqgLcqTn/fmzOpr4GBeGPqFdpEWFZa', '2026-02-08 03:36:19.466055+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-02-08 03:36:19.448825+00', '2026-02-08 03:36:19.470676+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'd26eeb07-e535-4c39-af56-65d198a564cb', 'authenticated', 'authenticated', 'kayla.garibay31@gmail.com', '$2a$10$U6BBLRnEkwdf/f5C8lNE9.rEXtWXusKX/nMujrP1AW4OqaDbBjBcK', '2026-02-07 21:57:52.556099+00', NULL, '', NULL, '53fbc4363e5ef07d28c6026f5d5a9e7c18114eebeb6c956cee1b84c4', '2026-02-08 04:59:56.490622+00', '', '', NULL, '2026-02-07 23:56:50.151148+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-02-07 21:57:52.495901+00', '2026-02-08 04:59:56.49477+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '3c5d2f75-6f91-48fa-9076-a140886692b4', 'authenticated', 'authenticated', 'happy@gmail.com', '$2a$10$fhMkLgkVDnpdUQ8gLTON1.QmnpHqt2pUApZSxfI0KxFHN3RWBVz7K', '2026-02-08 03:52:25.02669+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-02-08 03:52:25.01592+00', '2026-02-08 03:52:25.027598+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('f0eb9e61-fb13-4e4b-a0f0-61e1d43139f4', 'f0eb9e61-fb13-4e4b-a0f0-61e1d43139f4', '{"sub": "f0eb9e61-fb13-4e4b-a0f0-61e1d43139f4", "email": "testing@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2025-11-16 21:20:16.77531+00', '2025-11-16 21:20:16.775369+00', '2025-11-16 21:20:16.775369+00', 'c250c2ec-54a5-40d2-89d7-67a73f5b2c0b'),
	('1534f859-0288-4e9d-a5e7-1599355d4551', '1534f859-0288-4e9d-a5e7-1599355d4551', '{"sub": "1534f859-0288-4e9d-a5e7-1599355d4551", "email": "teating@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2025-11-16 21:26:37.012192+00', '2025-11-16 21:26:37.012243+00', '2025-11-16 21:26:37.012243+00', '25433661-a18f-4676-a129-c2c230304c04'),
	('0bbf93e5-34b4-4b4f-954c-d8971ced6236', '0bbf93e5-34b4-4b4f-954c-d8971ced6236', '{"sub": "0bbf93e5-34b4-4b4f-954c-d8971ced6236", "email": "tea@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2025-11-16 21:35:16.544914+00', '2025-11-16 21:35:16.544981+00', '2025-11-16 21:35:16.544981+00', '74773029-b2dd-46ca-89a0-09ed1f743051'),
	('d26eeb07-e535-4c39-af56-65d198a564cb', 'd26eeb07-e535-4c39-af56-65d198a564cb', '{"sub": "d26eeb07-e535-4c39-af56-65d198a564cb", "email": "kayla.garibay31@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2026-02-07 21:57:52.522209+00', '2026-02-07 21:57:52.523416+00', '2026-02-07 21:57:52.523416+00', 'dafbf523-3da8-46d4-9826-e70a31ce8c89'),
	('23c0b367-c772-4023-b705-33d6d39c3798', '23c0b367-c772-4023-b705-33d6d39c3798', '{"sub": "23c0b367-c772-4023-b705-33d6d39c3798", "email": "sad@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2026-02-08 00:13:21.438197+00', '2026-02-08 00:13:21.438866+00', '2026-02-08 00:13:21.438866+00', 'c934b349-3b90-4712-bf55-b4f43cf86b4b'),
	('3a879ee4-e346-4b20-b14a-dd30df38044f', '3a879ee4-e346-4b20-b14a-dd30df38044f', '{"sub": "3a879ee4-e346-4b20-b14a-dd30df38044f", "email": "kks@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2026-02-08 03:36:19.457443+00', '2026-02-08 03:36:19.458097+00', '2026-02-08 03:36:19.458097+00', 'a40cf717-38df-4404-a987-556dc18e6ff6'),
	('3c5d2f75-6f91-48fa-9076-a140886692b4', '3c5d2f75-6f91-48fa-9076-a140886692b4', '{"sub": "3c5d2f75-6f91-48fa-9076-a140886692b4", "email": "happy@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2026-02-08 03:52:25.018966+00', '2026-02-08 03:52:25.01902+00', '2026-02-08 03:52:25.01902+00', '29f8c5a9-509d-4137-89c1-377d0c794f62');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") VALUES
	('8d156631-9897-4811-b12c-2531463734bd', 'd26eeb07-e535-4c39-af56-65d198a564cb', '2026-02-07 23:56:50.154098+00', '2026-02-07 23:56:50.154098+00', NULL, 'aal1', NULL, NULL, 'Expo/1017756 CFNetwork/3860.300.31 Darwin/25.2.0', '76.219.240.107', NULL, NULL, NULL, NULL, NULL),
	('beaf9500-ed72-4a20-94bb-0dd2c5f7ccb7', '23c0b367-c772-4023-b705-33d6d39c3798', '2026-02-08 00:14:52.234424+00', '2026-02-08 00:14:52.234424+00', NULL, 'aal1', NULL, NULL, 'Expo/1017756 CFNetwork/3860.300.31 Darwin/25.2.0', '76.219.240.107', NULL, NULL, NULL, NULL, NULL),
	('d2f0ea08-a85d-4f72-a04b-126c68bad8b4', '23c0b367-c772-4023-b705-33d6d39c3798', '2026-02-08 00:15:29.213331+00', '2026-02-08 00:15:29.213331+00', NULL, 'aal1', NULL, NULL, 'Expo/1017756 CFNetwork/3860.300.31 Darwin/25.2.0', '76.219.240.107', NULL, NULL, NULL, NULL, NULL),
	('f7700f8f-ab96-4622-8088-d1f5044477a1', '23c0b367-c772-4023-b705-33d6d39c3798', '2026-02-08 00:36:53.759763+00', '2026-02-08 00:36:53.759763+00', NULL, 'aal1', NULL, NULL, 'Expo/1017756 CFNetwork/3860.300.31 Darwin/25.2.0', '76.219.240.107', NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('8d156631-9897-4811-b12c-2531463734bd', '2026-02-07 23:56:50.205255+00', '2026-02-07 23:56:50.205255+00', 'password', '3edd064a-bb69-425c-955e-c86601d25730'),
	('beaf9500-ed72-4a20-94bb-0dd2c5f7ccb7', '2026-02-08 00:14:52.256813+00', '2026-02-08 00:14:52.256813+00', 'password', '6717868e-5e3c-4054-a3d1-f37d2cc9b654'),
	('d2f0ea08-a85d-4f72-a04b-126c68bad8b4', '2026-02-08 00:15:29.216858+00', '2026-02-08 00:15:29.216858+00', 'password', '25735f16-2165-45b9-a5aa-a3e0e6fc8055'),
	('f7700f8f-ab96-4622-8088-d1f5044477a1', '2026-02-08 00:36:53.785011+00', '2026-02-08 00:36:53.785011+00', 'password', '1aa45530-2e39-45d0-908e-af566b16020b');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."one_time_tokens" ("id", "user_id", "token_type", "token_hash", "relates_to", "created_at", "updated_at") VALUES
	('7d711590-bf2d-4be7-90b0-2e9a1fa2211c', 'd26eeb07-e535-4c39-af56-65d198a564cb', 'recovery_token', '53fbc4363e5ef07d28c6026f5d5a9e7c18114eebeb6c956cee1b84c4', 'kayla.garibay31@gmail.com', '2026-02-08 04:59:56.505541', '2026-02-08 04:59:56.505541');


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 1, '3r3bengywdma', 'd26eeb07-e535-4c39-af56-65d198a564cb', false, '2026-02-07 23:56:50.1795+00', '2026-02-07 23:56:50.1795+00', NULL, '8d156631-9897-4811-b12c-2531463734bd'),
	('00000000-0000-0000-0000-000000000000', 2, 'ustnqg2md7vv', '23c0b367-c772-4023-b705-33d6d39c3798', false, '2026-02-08 00:14:52.248408+00', '2026-02-08 00:14:52.248408+00', NULL, 'beaf9500-ed72-4a20-94bb-0dd2c5f7ccb7'),
	('00000000-0000-0000-0000-000000000000', 3, '4l4rmq6p3ytv', '23c0b367-c772-4023-b705-33d6d39c3798', false, '2026-02-08 00:15:29.214225+00', '2026-02-08 00:15:29.214225+00', NULL, 'd2f0ea08-a85d-4f72-a04b-126c68bad8b4'),
	('00000000-0000-0000-0000-000000000000', 4, '37i7sg6u4vnl', '23c0b367-c772-4023-b705-33d6d39c3798', false, '2026-02-08 00:36:53.771307+00', '2026-02-08 00:36:53.771307+00', NULL, 'f7700f8f-ab96-4622-8088-d1f5044477a1');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."user" ("user_id", "email", "password", "fname", "lname", "status") OVERRIDING SYSTEM VALUE VALUES
	(3, 'remote-verify@example.com', 'demo', 'Remote', 'Verify', false),
	(4, 'remote-ac-verify@example.com', 'demo', 'Remote', 'Verify', false),
	(11, 'testing@gmail.com', 'Sogru1-rikwyx-qacqot', 'Testing ', 'teating ', false),
	(12, 'test2@gmail.com', 'dixhuz-hupki8-kUxmym', 'Test2', 'test2', false),
	(13, 'testing123@gmail.com', 'befrom-5penky-Finvez', 'Tester', 'test', false),
	(14, 'abandoned @gmail.com', '123', 'Ghhh', 'nams', false),
	(15, 'shsj@gmail.com', 'dyvmud-wudga9-moRhyk', 'Shs', 'shsh', false),
	(2, 'remote-test@example.com', 'demo', 'Remote', 'User', true),
	(16, 'johndoe@gmail.com', 'jstesting', 'John ', 'Doe', true),
	(17, 'example.sadaf@gmail.com', 'testing', 'Sadaf', 'Mohammad', true),
	(18, 'zozomar327@gmail.com', 'test', 'Shula', 'Mohammad', true),
	(25, 'kks@gmail.com', 'loviee', 'KK', 'KK', true),
	(21, 'sad@gmail.com', '$2a$10$C03e2rwYPysDGUDaSfFsVO41p5mfA0EoG6fdqGQCo081iO5WVVBjy', 'Sadaf', 'M', true),
	(26, 'happy@gmail.com', 'happy123', 'happy', 'happy', false),
	(19, 'kayla.garibay31@gmail.com', '$2a$10$uS6C2Xuh8jvpY1z2dz1nuO6UXfBvpxDybIjBRgW46nhhkbufjlwee', 'kayla', 'g', true);


--
-- Data for Name: admin; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."admin" ("user_id") VALUES
	(25);


--
-- Data for Name: photo; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: video; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."video" ("video_id", "bucket", "object_key", "original_filename", "mime_type", "byte_size", "duration_seconds", "width", "height", "uploader_user_id", "created_at") OVERRIDING SYSTEM VALUE VALUES
	(3, 'exercise-videos', 'crunches.mp4', 'crunches.mp4', 'video/mp4', 20000000, 26, 1920, 1080, 16, '2026-02-06 21:31:04.314302+00'),
	(4, 'exercise-videos', 'plank.mp4', 'plank.mp4', 'video/mp4', 20000000, 28, 1920, 1080, 16, '2026-02-06 21:31:55.74271+00');


--
-- Data for Name: exercise; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: tag; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: exercise_tag; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: module; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: module_exercise; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: password_resets; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."password_resets" ("id", "email", "token", "expires_at", "created_at") VALUES
	('96538d77-8ec5-408e-af1b-51046d702a84', 'johndoe@gmail.com', '4adbc46506ef86126ef308a69bcb6171ea2f6c63f7e12ab8f7493773ba26fe37', '2026-02-07 06:42:07.281+00', '2026-02-07 05:42:07.683277+00'),
	('b786b9f8-e1cc-4876-96b2-099088d4b29f', 'zozomar327@gmail.com', '097b45a224346d8818a4353b90baf60c5c295d2d9f368b0abe71bc78f18d31cb', '2026-02-07 06:45:51.49+00', '2026-02-07 05:45:51.788344+00'),
	('f9759394-1cf2-4f44-9dc8-8295b523f090', 'zozomar327@gmail.com', '079e24a401fe6f77fcfed4819500c5b2aff17758b21cd6fd718bbd8d59dbc9c5', '2026-02-07 06:46:46.86+00', '2026-02-07 05:46:47.009872+00'),
	('f87a248e-cf50-4ba3-9ead-f5983e846cef', 'zozomars327@gmail.com', '85639023942c74513486fff18334f07fa9a4551a92f230be6a20157ee09648b0', '2026-02-07 07:16:36.591+00', '2026-02-07 06:16:37.279401+00'),
	('c018b409-3b56-4f62-8880-2f0b38af9735', 'zozomars327@gmail.com', '72967a53d3adda78addb436d97d9cc82dec85dc454969dcab0724287363fc9b0', '2026-02-07 07:16:45.655+00', '2026-02-07 06:16:45.899972+00'),
	('0630e67f-98fd-4507-bde0-23dbc5bb2656', 'zozomars327@gmail.com', '88a31e89c5f6c71f9e5807646a6c855802567f9c7f8bb0a764dc3b603cc1e6db', '2026-02-07 07:16:47.193+00', '2026-02-07 06:16:47.449175+00'),
	('eb795667-dbb6-4b58-bcee-fed49cf596f7', 'abhaja@gmail.com', 'cf9c53a4a6bf2da0ba3045f20971ae0c08b220f4384d333967bf24c72769899f', '2026-02-07 07:23:24.429+00', '2026-02-07 06:23:24.862001+00'),
	('c49cae65-6ed0-450d-84b9-933d73d2ed7e', 'abhaja@gmail.com', 'b1e4fa94cf6d8394ee8d0e62e4b02cd1889a955effe7f99481acc3c8bd465efd', '2026-02-07 07:23:27.272+00', '2026-02-07 06:23:27.401364+00'),
	('88bf59ed-8083-4383-be24-34a3af99b55f', 'sadaf@gmail.con', '60923298767a8ec10260fde213f506c72fddd5b2b010ef3df6fa1f51d7349ed4', '2026-02-07 10:19:40.245+00', '2026-02-07 09:19:41.204592+00'),
	('fe517f0b-e39a-417b-a684-051634c25770', 'sadaf@gmail.con', '5f890fe87a6f9de07bb2cce68f649465785e3e60f9f0be96a2098ec48b233840', '2026-02-07 10:19:47.704+00', '2026-02-07 09:19:47.844291+00'),
	('04dae011-83b2-41ab-819a-90e9ad8159ba', 'kayla.garibay31@gmail.com', 'b56cd7b8fd77881f4d1c04c6e15524805058b106d7dd9a3edb434e43e870bf47', '2026-02-07 22:51:17.905+00', '2026-02-07 21:51:18.469646+00'),
	('a62e6b77-8071-49a8-84e4-297a1c9692e9', 'kayla.garibay31@gmail.com', '6064250a0c3c1d4e9143ce0fc338133bdfb07306305f01d202e375846e3714f4', '2026-02-07 22:58:11.181+00', '2026-02-07 21:58:11.481475+00'),
	('d90e0734-439e-4a1d-81ee-52f94f2ec9e5', 'kayla.garibay31@gmail.com', '1679582e5837ce8d6164888511a33fedd539506aa7f936b2cd2f61cf9d36dbf6', '2026-02-07 23:09:19.398+00', '2026-02-07 22:09:19.681901+00'),
	('73138de9-be60-49fb-9c2a-a3177dc86999', 'kayla.garibay31@gmail.com', '2429c9d0404681e0828cafa779b11b965e1ffbbb5f2170c16f9eb6eaebc295b9', '2026-02-07 23:59:38.206+00', '2026-02-07 22:59:38.809866+00'),
	('2048659f-5be4-404d-97bf-92fea94d8d5b', 'kayla.garibay31@gmail.com', '3383012540f2e3cc59e23e30d4c88ac09765606099e304b957af359d474afd0c', '2026-02-07 23:41:59.8+00', '2026-02-07 23:27:00.350822+00'),
	('d4c260e1-ccef-4890-81bc-5fa6cc46da78', 'kayla.garibay31@gmail.com', '6f0ec003b0a795cb297d381e264ba8ac7d75c526e738e1ae5f6fb72896fdf007', '2026-02-07 23:48:32.453+00', '2026-02-07 23:33:32.916164+00'),
	('169149d0-53f4-44ea-b67c-383f8e7fc099', 'shma@gmail.com', '6fbe76c9eb6633eb9b74ac0d20f49d09915da68a7fdaa930c899eccfbf01e54b', '2026-02-08 00:41:55.325+00', '2026-02-08 00:26:55.619348+00'),
	('7b15529b-2373-4f67-a540-5534ed904f8c', 'shhd@gmail.com', 'e165f60114a561666ec4ea498d1c04eb7cb0c5e5e297449fe84de4b5b9738727', '2026-02-08 01:34:53.568+00', '2026-02-08 01:19:53.794925+00'),
	('a2593ee2-73a8-4185-bc5a-f7727599cd2d', 'shhd@gmail.com', '8d5c8318edaa3d86ce75e137fd1b3a6949a68fcc24426fb3015611f9ff34632e', '2026-02-08 01:34:56.638+00', '2026-02-08 01:19:56.744288+00'),
	('e60c56ea-2141-4419-a2bd-553e777767d8', 'zozomar327@gmail.com', '2c2c2cd7f705692f2cc266dfae5cab482695906a24d3f6610219ec0f0cbec89b', '2026-02-08 02:01:57.284+00', '2026-02-08 01:46:57.480971+00'),
	('ef9b7762-f31e-48f0-b27a-37588320a0ed', 'zozomar327@gmail.com', '4dd77bb11269eafb92d64af1d07446b1a2b9c9ca98d8027206b8d06abbd601b8', '2026-02-08 02:02:31.038+00', '2026-02-08 01:47:31.18664+00'),
	('20cd412c-014c-4522-97c0-273dd49617b3', 'kayla.garibay31@gmail.com', '67f666400b52d34cdca6b0597823cac0f42291946eca63e247ab3b075ef7274e', '2026-02-08 04:05:05.51+00', '2026-02-08 03:50:05.676451+00'),
	('0ed8f5d4-9b2f-4e3e-9bac-bff67be9c18c', 'asd@gmail.com', 'f884a5cc2a27e5236c469d47e5f1af7e87ffb6b9d02a7c044ac3c8a1037db674', '2026-02-08 04:15:51.419+00', '2026-02-08 04:00:51.669805+00'),
	('f15681ba-e2df-4d62-9984-ab2f63a52cd4', 'asd@gmail.com', 'b791671024295ec651d1d27fb5218ff2878d5ff2f780fdb30abb9665db4619d2', '2026-02-08 04:15:54.087+00', '2026-02-08 04:00:54.353139+00'),
	('e4a1ba97-a980-4313-bc5e-b0ce69a1db79', 'asd@gmail.com', '0431211158a4edf93e23a73e200f3b5362bce93c3d426d9b4dff76a94c93bff7', '2026-02-08 04:15:55.537+00', '2026-02-08 04:00:55.791011+00'),
	('f5583409-537c-4109-a8d5-6ba7056aaeaa', 'kayla.garibay31@gmail.com', 'd220e45187f00f6ef040c023bcb5284c5c7ade3a7b883ef3b5fd488e3ba69183', '2026-02-08 04:21:00.568+00', '2026-02-08 04:06:00.819453+00'),
	('578c14bd-95ff-482e-9b6d-9de1e2f56127', 'kayla.garibay31@gmail.com', 'e3fc11bc91b5b5cdcf66635e045762606d29867aa84e3bf039fdd4a453807bc9', '2026-02-08 04:35:36.946+00', '2026-02-08 04:20:37.083164+00'),
	('303bacdd-b18d-4de2-9df2-74e0419d4e68', 'kayla.garibay31@gmail.com', 'da7d5c8d60027b635b624e8bec4c89362aa1033115d46914340e2abc1ff82837', '2026-02-08 04:38:27.436+00', '2026-02-08 04:23:27.693386+00'),
	('00389f80-40ff-4285-a8bb-4763796800a4', 'kayla.garibay31@gmail.com', '0b14f0df8575ae1888aff8f4fdf37bee833e36778aef7cea24a6205c6c7ac7a1', '2026-02-08 04:40:54.202+00', '2026-02-08 04:25:54.56611+00'),
	('5aa4d96d-da64-4305-9c51-fafd771f0daf', 'kayla.garibay31@gmail.com', '6b464685249f67ad85d76518a9df3cd940aba0a6aabf721237ec0e99f271aedd', '2026-02-08 04:43:04.186+00', '2026-02-08 04:28:04.367779+00');


--
-- Data for Name: patient; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profiles" ("id", "email", "display_name", "avatar_url", "created_at", "updated_at") VALUES
	(2, 'remote-test@example.com', NULL, NULL, '2025-11-03 05:52:13.943842+00', '2025-11-03 05:52:13.943842+00'),
	(3, 'remote-verify@example.com', NULL, NULL, '2025-11-03 06:39:14.10871+00', '2025-11-03 06:39:14.10871+00'),
	(4, 'remote-ac-verify@example.com', NULL, NULL, '2025-11-03 06:50:53.216621+00', '2025-11-03 06:50:53.216621+00'),
	(11, 'testing@gmail.com', NULL, NULL, '2025-11-16 21:46:52.051835+00', '2025-11-16 21:46:52.051835+00'),
	(12, 'test2@gmail.com', NULL, NULL, '2025-11-16 22:51:27.53061+00', '2025-11-16 22:51:27.53061+00'),
	(13, 'testing123@gmail.com', NULL, NULL, '2025-11-17 00:33:48.525628+00', '2025-11-17 00:33:48.525628+00'),
	(14, 'abandoned @gmail.com', NULL, NULL, '2025-11-17 00:41:04.210544+00', '2025-11-17 00:41:04.210544+00'),
	(15, 'shsj@gmail.com', NULL, NULL, '2025-11-17 01:15:35.444189+00', '2025-11-17 01:15:35.444189+00'),
	(16, 'johndoe@gmail.com', NULL, NULL, '2025-11-17 01:26:31.012784+00', '2025-11-17 01:26:31.012784+00'),
	(17, 'example.sadaf@gmail.com', NULL, NULL, '2026-02-06 07:14:15.927472+00', '2026-02-06 07:14:15.927472+00'),
	(18, 'zozomar327@gmail.com', NULL, NULL, '2026-02-07 05:43:56.364502+00', '2026-02-07 05:43:56.364502+00'),
	(19, 'kayla.garibay31@gmail.com', NULL, NULL, '2026-02-07 21:19:12.262289+00', '2026-02-07 21:19:12.262289+00'),
	(21, 'sad@gmail.com', NULL, NULL, '2026-02-08 00:13:21.025984+00', '2026-02-08 00:13:21.025984+00'),
	(25, 'kks@gmail.com', NULL, NULL, '2026-02-08 01:53:01.608972+00', '2026-02-08 01:53:01.608972+00'),
	(26, 'happy@gmail.com', NULL, NULL, '2026-02-08 04:21:58.885024+00', '2026-02-08 04:21:58.885024+00');


--
-- Data for Name: smoke_tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: smoke_widgets; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_module; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_exercise; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") VALUES
	('exercise-videos', 'exercise-videos', NULL, '2025-11-17 04:30:12.6569+00', '2025-11-17 04:30:12.6569+00', true, false, NULL, NULL, NULL, 'STANDARD');


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."objects" ("id", "bucket_id", "name", "owner", "created_at", "updated_at", "last_accessed_at", "metadata", "version", "owner_id", "user_metadata", "level") VALUES
	('14141452-1840-4769-99d4-ca306e70dd20', 'exercise-videos', 'crunches.mp4', NULL, '2025-11-17 04:30:13.577542+00', '2025-11-17 04:47:36.502328+00', '2025-11-17 04:30:13.577542+00', '{"eTag": "\"3c482f6dbcebc21d4e3dd5aaf5d9ec06\"", "size": 222338, "mimetype": "video/mp4", "cacheControl": "max-age=3600", "lastModified": "2025-11-17T04:47:37.000Z", "contentLength": 222338, "httpStatusCode": 200}', '0f159eae-2abd-494e-81fe-4f9f867c6611', NULL, '{}', 1),
	('a5c4f69d-5010-4fb5-b971-2683584e1139', 'exercise-videos', 'plank.mp4', NULL, '2025-11-17 04:30:31.150392+00', '2025-11-17 04:47:37.408586+00', '2025-11-17 04:30:31.150392+00', '{"eTag": "\"fc5bd39124114818dc0f7046cfd98fc5\"", "size": 559252, "mimetype": "video/mp4", "cacheControl": "max-age=3600", "lastModified": "2025-11-17T04:47:38.000Z", "contentLength": 559252, "httpStatusCode": 200}', '5f4ff122-6dfc-46a7-ae1b-8ebfc942bd22', NULL, '{}', 1);


--
-- Data for Name: prefixes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 4, true);


--
-- Name: exercise_exercise_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."exercise_exercise_id_seq"', 1, false);


--
-- Name: module_exercise_module_exercise_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."module_exercise_module_exercise_id_seq"', 1, false);


--
-- Name: module_module_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."module_module_id_seq"', 1, false);


--
-- Name: photo_photo_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."photo_photo_id_seq"', 1, false);


--
-- Name: tag_tag_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."tag_tag_id_seq"', 1, false);


--
-- Name: user_exercise_user_exercise_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."user_exercise_user_exercise_id_seq"', 1, false);


--
-- Name: user_module_user_module_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."user_module_user_module_id_seq"', 1, false);


--
-- Name: user_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."user_user_id_seq"', 26, true);


--
-- Name: video_video_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."video_video_id_seq"', 4, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict eD5FDWDTbA5cRx0Rq67sMYfIDVbEKXfk1HvQJntakNqr9VUknQuAxQKE7Yn8I7U

RESET ALL;
