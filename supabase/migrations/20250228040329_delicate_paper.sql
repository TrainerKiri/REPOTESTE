/*
  # Atualizar políticas para memórias públicas

  1. Alterações de Segurança
     - Adicionar política para permitir acesso público de leitura às memórias
     - Manter políticas existentes para controle de acesso de escrita
  
  2. Notas
     - As memórias agora serão visíveis para todos os usuários, mesmo sem autenticação
     - Apenas usuários autenticados (administradores) poderão criar, atualizar ou excluir memórias
*/

-- Adicionar política para permitir acesso público de leitura
CREATE POLICY "Memórias são visíveis publicamente"
    ON memories
    FOR SELECT
    TO anon
    USING (true);