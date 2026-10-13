-- Enable realtime on the transactions table so the admin panel and creator dashboards
-- receive live updates when a new purchase comes in
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
