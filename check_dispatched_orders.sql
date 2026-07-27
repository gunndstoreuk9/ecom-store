-- Check orders that contribute to dispatch count
-- These are orders with dispatched_at and delivery_tracking set

SELECT 
    a.name as agent_name,
    a.id as agent_id,
    COUNT(o.id) as dispatched_count,
    STRING_AGG(o.public_order_number, ', ') as order_numbers
FROM orders o
JOIN agents a ON o.assigned_agent_id = a.id
WHERE o.dispatched_at IS NOT NULL 
  AND o.delivery_tracking IS NOT NULL
GROUP BY a.id, a.name
ORDER BY dispatched_count DESC;

-- Show detailed view of these orders
SELECT 
    o.public_order_number,
    a.name as agent_name,
    o.status,
    o.dispatched_at,
    o.delivery_tracking,
    o.created_at
FROM orders o
JOIN agents a ON o.assigned_agent_id = a.id
WHERE o.dispatched_at IS NOT NULL 
  AND o.delivery_tracking IS NOT NULL
ORDER BY a.name, o.dispatched_at DESC;