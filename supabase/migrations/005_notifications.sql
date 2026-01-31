-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(500),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- RLS policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- System can insert notifications (we'll use service role for this)
CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to create notification when application status changes
CREATE OR REPLACE FUNCTION notify_application_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  campaign_title TEXT;
  creator_name TEXT;
BEGIN
  -- Get campaign title
  SELECT title INTO campaign_title FROM public.campaigns WHERE id = NEW.campaign_id;

  -- Get creator name
  SELECT full_name INTO creator_name FROM public.users WHERE id = NEW.creator_id;

  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Notify creator that their application was approved
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      NEW.creator_id,
      'application_approved',
      'Application Approved!',
      'Your application to "' || campaign_title || '" has been approved. You can now submit posts!',
      '/campaigns/' || NEW.campaign_id
    );
  ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    -- Notify creator that their application was rejected
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      NEW.creator_id,
      'application_rejected',
      'Application Update',
      'Your application to "' || campaign_title || '" was not accepted.',
      '/campaigns/' || NEW.campaign_id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for application status changes
DROP TRIGGER IF EXISTS on_application_status_change ON public.campaign_applications;
CREATE TRIGGER on_application_status_change
  AFTER UPDATE OF status ON public.campaign_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_application_status_change();

-- Function to notify brand of new application
CREATE OR REPLACE FUNCTION notify_new_application()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  campaign_data RECORD;
  creator_name TEXT;
BEGIN
  -- Get campaign data
  SELECT id, brand_id, title INTO campaign_data FROM public.campaigns WHERE id = NEW.campaign_id;

  -- Get creator name
  SELECT full_name INTO creator_name FROM public.users WHERE id = NEW.creator_id;

  -- Notify brand of new application
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (
    campaign_data.brand_id,
    'new_application',
    'New Application',
    creator_name || ' applied to your campaign "' || campaign_data.title || '"',
    '/campaigns/' || NEW.campaign_id || '/applications'
  );

  RETURN NEW;
END;
$$;

-- Trigger for new applications
DROP TRIGGER IF EXISTS on_new_application ON public.campaign_applications;
CREATE TRIGGER on_new_application
  AFTER INSERT ON public.campaign_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_application();
