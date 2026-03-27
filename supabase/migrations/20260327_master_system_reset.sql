DO $$ 
DECLARE 
    v_admin_id uuid;
BEGIN
    -- 1. Identifica o ID do Alexandre
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'alexandre.kondo@gmail.com';

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Usuário administrador não encontrado. Verifique o e-mail.';
    END IF;

    -- 2. Desabilita triggers para limpeza rápida sem erros de FK circulantes
    SET session_replication_role = 'replica';

    -- 3. Limpa todas as tabelas de dados de negócio (Cascateamento manual para garantir)
    -- Ordem: Filhos primeiro ou usar CASCADE
    TRUNCATE public.deliveries RESTART IDENTITY CASCADE;
    TRUNCATE public.staff_invites RESTART IDENTITY CASCADE;
    TRUNCATE public.staff_schedules RESTART IDENTITY CASCADE;
    TRUNCATE public.vendor_subscriptions RESTART IDENTITY CASCADE;
    TRUNCATE public.points_log RESTART IDENTITY CASCADE;
    TRUNCATE public.ranking_settings RESTART IDENTITY CASCADE;
    TRUNCATE public.level_configs RESTART IDENTITY CASCADE;
    
    TRUNCATE public.order_items RESTART IDENTITY CASCADE;
    TRUNCATE public.orders RESTART IDENTITY CASCADE;
    TRUNCATE public.waiter_calls RESTART IDENTITY CASCADE;
    TRUNCATE public.menu_items RESTART IDENTITY CASCADE;
    TRUNCATE public.vendors RESTART IDENTITY CASCADE;
    TRUNCATE public.events RESTART IDENTITY CASCADE;
    TRUNCATE public.organization_members RESTART IDENTITY CASCADE;
    TRUNCATE public.organizations RESTART IDENTITY CASCADE;
    
    -- Limpa registros de notificações se houver (adicionado para completude)
    -- TRUNCATE public.notifications RESTART IDENTITY CASCADE; 
    
    -- 4. Limpa perfis exceto o Alexandre e reseta stats do Alexandre
    DELETE FROM public.profiles WHERE id != v_admin_id;
    UPDATE public.profiles 
    SET points = 0, level = 'bronze', vendor_id = NULL
    WHERE id = v_admin_id;
    
    -- 5. Limpa usuários do auth exceto o Alexandre
    -- Nota: Rodar isso no Dashboard do Supabase remove os usuários do Auth Service
    DELETE FROM auth.users WHERE id != v_admin_id;

    -- 6. Limpa arquivos e metadados de STORAGE (imagens das barracas e itens)
    DELETE FROM storage.objects WHERE bucket_id = 'menu-images';

    -- 7. Restaura o comportamento normal dos triggers
    SET session_replication_role = 'origin';

    RAISE NOTICE 'Banco de dados limpo com sucesso. Apenas Alexandre Kondo foi mantido.';
END $$;
