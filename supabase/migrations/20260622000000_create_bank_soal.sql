-- Create bank_soal table
CREATE TABLE IF NOT EXISTS public.bank_soal (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    folder TEXT DEFAULT 'Umum',
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.bank_soal ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own bank_soal"
    ON public.bank_soal FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank_soal"
    ON public.bank_soal FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank_soal"
    ON public.bank_soal FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank_soal"
    ON public.bank_soal FOR DELETE
    USING (auth.uid() = user_id);
