-- Create spaced_repetition_data table in Supabase
CREATE TABLE IF NOT EXISTS spaced_repetition_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_name TEXT NOT NULL,
    interval_days INTEGER DEFAULT 1,
    repetitions INTEGER DEFAULT 0,
    ease_factor DECIMAL(3,2) DEFAULT 2.5,
    last_review TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_review TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    performance_history JSONB DEFAULT '[]'::jsonb,
    forgetting_probability DECIMAL(3,2) DEFAULT 1.0,
    difficulty TEXT DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, topic_name)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_spaced_repetition_user_next_review 
ON spaced_repetition_data(user_id, next_review);

-- Enable RLS (Row Level Security)
ALTER TABLE spaced_repetition_data ENABLE ROW LEVEL SECURITY;

-- Create policy for users to access their own data
CREATE POLICY "Users can access their own spaced repetition data" 
ON spaced_repetition_data FOR ALL 
USING (auth.uid() = user_id);
