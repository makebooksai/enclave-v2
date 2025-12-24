-- Add 'enclave' to aurora_interface enum
-- This allows Enclave Define to use 'enclave' as the interface value

ALTER TYPE aurora_interface ADD VALUE 'enclave' BEFORE 'vscode';
