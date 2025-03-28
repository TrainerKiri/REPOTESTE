/*
  # Adicionar suporte para múltiplas imagens por memória

  1. Nova Tabela
    - `memory_images`
      - `id` (uuid, primary key)
      - `memory_id` (uuid, referência para memories)
      - `url` (text, URL da imagem)
      - `description` (text, descrição opcional da imagem)
      - `created_at` (timestamptz)

  2. Segurança
    - Habilitar RLS na tabela memory_images
    - Adicionar políticas para:
      - Leitura pública
      - Escrita apenas para usuários autenticados
*/

CREATE TABLE memory_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id uuid REFERENCES memories(id) ON DELETE CASCADE NOT NULL,
    url text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE memory_images ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Imagens são visíveis publicamente"
    ON memory_images
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Apenas usuários autenticados podem inserir imagens"
    ON memory_images
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM memories
            WHERE id = memory_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Apenas donos podem deletar imagens"
    ON memory_images
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM memories
            WHERE id = memory_id
            AND user_id = auth.uid()
        )
    );