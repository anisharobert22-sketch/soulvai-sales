-- The product chips on the capture form were a hardcoded list shared by
-- every org, regardless of what that org actually sells. A POS vendor
-- reselling their own hardware needs their own product names here, not
-- SoulvAI/Accura's. Each org now carries its own editable list, seeded
-- with the same defaults everyone already had so nothing changes until
-- an admin edits it.
ALTER TABLE organizations
  ADD COLUMN product_list TEXT[] NOT NULL DEFAULT ARRAY[
    'Accura Lite', 'Accura Pro', 'POS Terminal', 'GST Filing Add-on', 'Tally Migration'
  ];
