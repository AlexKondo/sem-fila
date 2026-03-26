-- Migration: adiciona colunas Asaas ao profiles para tokenização de cartão
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS asaas_customer_id text,
  ADD COLUMN IF NOT EXISTS asaas_card_token  text,
  ADD COLUMN IF NOT EXISTS asaas_card_last4  text;
