-- Drop the old trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_type_val user_type;
BEGIN
  -- Get user type, default to 'creator'
  user_type_val := COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type, 'creator');

  -- Insert into users table
  INSERT INTO public.users (id, email, user_type, full_name, company_name)
  VALUES (
    NEW.id,
    NEW.email,
    user_type_val,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'company_name'
  );

  -- Create corresponding profile based on user type
  IF user_type_val = 'creator' THEN
    INSERT INTO public.creator_profiles (user_id)
    VALUES (NEW.id);
  ELSIF user_type_val = 'brand' THEN
    INSERT INTO public.brand_profiles (user_id)
    VALUES (NEW.id);
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
