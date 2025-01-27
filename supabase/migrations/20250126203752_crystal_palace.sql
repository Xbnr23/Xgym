/*
  # Create Authentication and Subscription Tables

  1. New Tables
    - `subscribers`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `first_name` (text)
      - `last_name` (text)
      - `phone` (text)
      - `amount` (numeric)
      - `start_date` (date)
      - `end_date` (date)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `subscribers` table
    - Add policies for authenticated users to:
      - Read all subscribers
      - Insert new subscribers
      - Update their own subscribers
      - Delete their own subscribers
*/

-- Create subscribers table
CREATE TABLE IF NOT EXISTS subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  amount numeric NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view all subscribers"
  ON subscribers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create subscribers"
  ON subscribers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscribers"
  ON subscribers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscribers"
  ON subscribers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);