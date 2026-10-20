-- Runs once, when the Postgres volume is first created.
-- API tests use this separate database so they never touch development data.
CREATE DATABASE finni_test OWNER finni;
