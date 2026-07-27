-- Reset dispatch counts for Halima and Omaima
-- This will change dispatched orders to shipped status, clearing the "للإرسال" counts

-- First, check current situation
SELECT 
    'BEFORE UPDATE' as stage,
    a.name as agent_name,
    COUNT(o.id) as dispatched_count,
    STRING_AGG(o.public_order_number, ', ') as order_numbers
FROM orders o
JOIN agents a ON o.assigned_agent_id = a.id  
WHERE o.dispatched_at IS NOT NULL 
  AND o.delivery_tracking IS NOT NULL
  AND o.status = 'dispatched'
GROUP BY a.id, a.name
ORDER BY dispatched_count DESC;

-- Update dispatched orders to shipped status
-- This removes them from the dispatch count
UPDATE orders 
SET status = 'shipped'
WHERE dispatched_at IS NOT NULL 
  AND delivery_tracking IS NOT NULL
  AND status = 'dispatched';

-- Verify the fix - should show 0 dispatched orders
SELECT 
    'AFTER UPDATE' as stage,
    a.name as agent_name,
    COUNT(CASE WHEN o.dispatched_at IS NOT NULL AND o.delivery_tracking IS NOT NULL AND o.status = 'dispatched' THEN 1 END) as dispatched_count
FROM orders o
RIGHT JOIN agents a ON o.assigned_agent_id = a.id
WHERE a.name ILIKE '%halima%' OR a.name ILIKE '%omaima%'
GROUP BY a.id, a.name
ORDER BY a.name;